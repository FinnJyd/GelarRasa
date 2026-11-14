import { at, calendar, HOURLY_POLLUTANTS, mean, quantile, quantiles } from '../../data/hourly';
import type { HourlySelection } from '../../data/hourly';
import { STATION_ROAD_DISTANCE } from './model';
import type {
  CorrelationMatrix,
  DirectionSector,
  DriverRankingItem,
  DriversData,
  ExtremeConditionMetrics,
  ExtremeDiurnalHourly,
  ExtremeStatsByThresholdMode,
  StationRoseInfo,
  WindBin,
  WindSiteTypeData,
} from './types';

// Average (tie-corrected) ranks; a native typed-array sort plus binary search avoids sorting ~10^5 objects.
// Hoisted per-hour constants: the hourly loop runs ~10^6 times at full network scope.
const WIND_BIN_EDGES = [0.5, 1, 2, 3, 5, Infinity];
const HOUR_LABELS = Array.from({ length: 24 }, (_, hour) => String(hour));
const HAZE_MODES = ['all', 'haze'] as const;
const NONHAZE_MODES = ['all', 'nonhaze'] as const;

function ranks(values: readonly number[]): number[] {
  const sorted = Float64Array.from(values).sort(), n = sorted.length;
  // runEnd[i] is the exclusive end of the tie run starting at i, so each value needs one lower-bound search.
  const runEnd = new Uint32Array(n);
  for (let i = n - 1; i >= 0; i--) runEnd[i] = i + 1 < n && sorted[i + 1] === sorted[i] ? runEnd[i + 1] ?? n : i + 1;
  return values.map(value => {
    let low = 0, high = n;
    while (low < high) {
      const middle = (low + high) >>> 1;
      if ((sorted[middle] ?? 0) < value) low = middle + 1; else high = middle;
    }
    return (low + (runEnd[low] ?? n) + 1) / 2;
  });
}

export function spearman(x: readonly number[], y: readonly number[]): number | null {
  if (x.length !== y.length || x.length < 30) return null;
  const rx = ranks(x), ry = ranks(y), center = (x.length + 1) / 2;
  let cross = 0, xx = 0, yy = 0;
  rx.forEach((value, i) => {
    const other = ry[i];
    if (other === undefined) return;
    const a = value - center, b = other - center;
    cross += a * b;
    xx += a * a;
    yy += b * b;
  });
  return xx > 0 && yy > 0 ? cross / Math.sqrt(xx * yy) : null;
}

function pearson(x: readonly number[], y: readonly number[]): { r: number | null; r2: number } {
  if (x.length !== y.length || x.length < 10) return { r: null, r2: 0 };
  const n = x.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0, sumYY = 0;
  for (let i = 0; i < n; i++) {
    const xi = x[i] ?? 0, yi = y[i] ?? 0;
    sumX += xi; sumY += yi; sumXY += xi * yi; sumXX += xi * xi; sumYY += yi * yi;
  }
  const denomX = n * sumXX - sumX * sumX;
  const denomY = n * sumYY - sumY * sumY;
  if (denomX <= 0 || denomY <= 0) return { r: null, r2: 0 };
  const r = (n * sumXY - sumX * sumY) / Math.sqrt(denomX * denomY);
  return { r, r2: Math.max(0, Math.min(1, r * r)) };
}

function etaSquared(categories: readonly string[], values: readonly number[]): number {
  if (values.length < 10) return 0;
  const yMean = mean(values);
  if (yMean === null) return 0;
  let ssTot = 0;
  for (const v of values) ssTot += (v - yMean) ** 2;
  if (ssTot <= 0) return 0;

  const groups = new Map<string, number[]>();
  for (let i = 0; i < categories.length; i++) {
    const cat = categories[i] ?? 'unknown';
    const val = values[i];
    if (val === undefined) continue;
    let list = groups.get(cat);
    if (!list) { list = []; groups.set(cat, list); }
    list.push(val);
  }
  let ssBetween = 0;
  for (const groupValues of groups.values()) {
    const gMean = mean(groupValues);
    if (gMean !== null) ssBetween += groupValues.length * ((gMean - yMean) ** 2);
  }
  return Math.max(0, Math.min(1, ssBetween / ssTot));
}

interface Collector {
  wind: number[];
  humidity: number[];
  temperature: number[];
  hour: number[];
  count: number;
}
function newCollector(): Collector {
  return { wind: [], humidity: [], temperature: [], hour: [], count: 0 };
}
function makeConditionMetrics(c: Collector): ExtremeConditionMetrics {
  return {
    median_wind_speed: quantile(c.wind, 0.5),
    median_humidity: quantile(c.humidity, 0.5),
    median_temperature: quantile(c.temperature, 0.5),
    median_hour: quantile(c.hour, 0.5),
    count: c.count,
  };
}

export function aggregateDrivers(selection: HourlySelection): DriversData {
  const { dates, stations, pollutant } = selection;
  const days = calendar(dates);
  const column = HOURLY_POLLUTANTS.indexOf(pollutant);
  const pm25Col = HOURLY_POLLUTANTS.indexOf('PM2.5');
  const no2Col = HOURLY_POLLUTANTS.indexOf('NO2');
  const coCol = HOURLY_POLLUTANTS.indexOf('CO');

  const allHourlyValues: number[] = [];
  const stationValuesMap: Record<string, number[]> = {};

  for (const station of stations) {
    const sValues: number[] = [];
    for (let h = 0; h < dates.length * 24; h++) {
      const val = at(station, h, column);
      if (val !== null) {
        allHourlyValues.push(val);
        sValues.push(val);
      }
    }
    stationValuesMap[station.station.code] = sValues;
  }

  const globalThreshold = quantile(allHourlyValues, 0.90);
  const stationThresholdMap: Record<string, number | null> = {};
  const validStationThresholds: number[] = [];
  for (const [code, sVals] of Object.entries(stationValuesMap)) {
    const stThresh = quantile(sVals, 0.90);
    stationThresholdMap[code] = stThresh;
    if (stThresh !== null) validStationThresholds.push(stThresh);
  }
  const medianStationThreshold = quantile(validStationThresholds, 0.5);

  const windBySiteTypeMap: Record<string, { allValues: number[]; bins: number[][] }> = {};
  const pollution_rose: Record<string, DirectionSector[]> = {};
  const pollution_rose_meta: Record<string, StationRoseInfo> = {};
  const traffic_scatter: DriversData['traffic_scatter'] = {};

  const seasonPairs = Object.fromEntries(
    ['all', 'haze', 'nonhaze'].map(mode => [mode, Array.from({ length: 3 }, () => ({ x: [] as number[], y: [] as number[] }))]),
  );

  const globalSplit = {
    all: { ext: newCollector(), norm: newCollector() },
    haze: { ext: newCollector(), norm: newCollector() },
    nonhaze: { ext: newCollector(), norm: newCollector() },
  };
  const stationSplit = {
    all: { ext: newCollector(), norm: newCollector() },
    haze: { ext: newCollector(), norm: newCollector() },
    nonhaze: { ext: newCollector(), norm: newCollector() },
  };

  const globalDiurnal = Array.from({ length: 24 }, (_, hour) => ({
    hour, haze_extreme: 0, haze_valid: 0, nonhaze_extreme: 0, nonhaze_valid: 0,
  }));
  const stationDiurnal = Array.from({ length: 24 }, (_, hour) => ({
    hour, haze_extreme: 0, haze_valid: 0, nonhaze_extreme: 0, nonhaze_valid: 0,
  }));

  const globalGrouped = {
    extreme: { wind: [] as number[], humidity: [] as number[], temperature: [] as number[], haze: 0, count: 0, hours: Array<number>(24).fill(0) },
    normal: { wind: [] as number[], humidity: [] as number[], temperature: [] as number[], haze: 0, count: 0, hours: Array<number>(24).fill(0) },
  };
  const stationGrouped = {
    extreme: { wind: [] as number[], humidity: [] as number[], temperature: [] as number[], haze: 0, count: 0, hours: Array<number>(24).fill(0) },
    normal: { wind: [] as number[], humidity: [] as number[], temperature: [] as number[], haze: 0, count: 0, hours: Array<number>(24).fill(0) },
  };

  const dailyPm25: number[] = [];
  const dailyTemp: number[] = [];
  const dailyHum: number[] = [];
  const dailyWind: number[] = [];
  const dailyStation: string[] = [];
  const dailySiteType: string[] = [];
  const dailyHaze: string[] = [];
  const hourlyPm25: number[] = [];
  const hourlyHour: string[] = [];

  for (const station of stations) {
    const code = station.station.code;
    const siteType = station.station.siteType;
    const sectors = Array.from({ length: 16 }, (): number[] => []);
    let stationValidHours = 0;
    const sThreshold = stationThresholdMap[code] ?? null;

    const siteTypeEntry = windBySiteTypeMap[siteType] ??= { allValues: [], bins: Array.from({ length: 6 }, () => []) };

    const no2All: number[] = [], no2Nonhaze: number[] = [];
    const coAll: number[] = [], coNonhaze: number[] = [];
    const pm25All: number[] = [], pm25Nonhaze: number[] = [];

    for (let d = 0; d < dates.length; d++) {
      const day = days[d];
      const isHaze = day?.haze ?? false;
      const dayPm25Hours: number[] = [];
      const dayTempHours: number[] = [];
      const dayHumHours: number[] = [];
      const dayWindHours: number[] = [];

      for (let h = 0; h < 24; h++) {
        const hourIdx = d * 24 + h;
        const value = at(station, hourIdx, column);
        const speed = at(station, hourIdx, 8);
        const direction = at(station, hourIdx, 9);
        const temp = at(station, hourIdx, 6);
        const hum = at(station, hourIdx, 7);

        const pm25Val = at(station, hourIdx, pm25Col);
        if (pm25Val !== null) {
          dayPm25Hours.push(pm25Val);
          pm25All.push(pm25Val);
          if (!isHaze) pm25Nonhaze.push(pm25Val);
          hourlyPm25.push(pm25Val);
          hourlyHour.push(HOUR_LABELS[h] ?? String(h));
        }

        const no2Val = at(station, hourIdx, no2Col);
        if (no2Val !== null) {
          no2All.push(no2Val);
          if (!isHaze) no2Nonhaze.push(no2Val);
        }

        const coVal = at(station, hourIdx, coCol);
        if (coVal !== null) {
          coAll.push(coVal);
          if (!isHaze) coNonhaze.push(coVal);
        }

        if (temp !== null) dayTempHours.push(temp);
        if (hum !== null) dayHumHours.push(hum);
        if (speed !== null) dayWindHours.push(speed);

        if (value === null) continue;
        stationValidHours++;

        if (speed !== null && direction !== null && speed >= 0.5) {
          const secIdx = Math.floor((direction + 11.25) / 22.5) % 16;
          sectors[secIdx]?.push(value);
        }

        if (speed !== null && speed >= 0) {
          let binIdx = 0;
          while (binIdx < WIND_BIN_EDGES.length && !(speed < (WIND_BIN_EDGES[binIdx] ?? Infinity))) binIdx++;
          siteTypeEntry.bins[binIdx]?.push(value);
          siteTypeEntry.allValues.push(value);
        }

        for (const mode of isHaze ? HAZE_MODES : NONHAZE_MODES) {
          const pairs = seasonPairs[mode];
          if (!pairs) continue;
          for (let m = 0; m < 3; m++) {
            const wVal = at(station, hourIdx, m + 6);
            const pair = pairs[m];
            if (wVal !== null && pair) { pair.x.push(value); pair.y.push(wVal); }
          }
        }

        if (isHaze) {
          globalDiurnal[h]!.haze_valid++;
          stationDiurnal[h]!.haze_valid++;
        } else {
          globalDiurnal[h]!.nonhaze_valid++;
          stationDiurnal[h]!.nonhaze_valid++;
        }

        if (globalThreshold !== null) {
          const isGlobalExt = value > globalThreshold;
          if (isGlobalExt) {
            if (isHaze) globalDiurnal[h]!.haze_extreme++;
            else globalDiurnal[h]!.nonhaze_extreme++;
          }
          const grp = isGlobalExt ? globalGrouped.extreme : globalGrouped.normal;
          grp.count++;
          if (isHaze) grp.haze++;
          grp.hours[h] = (grp.hours[h] ?? 0) + 1;
          if (speed !== null) grp.wind.push(speed);
          if (hum !== null) grp.humidity.push(hum);
          if (temp !== null) grp.temperature.push(temp);

          for (const m of isHaze ? HAZE_MODES : NONHAZE_MODES) {
            const c = isGlobalExt ? globalSplit[m].ext : globalSplit[m].norm;
            c.count++;
            c.hour.push(h);
            if (speed !== null) c.wind.push(speed);
            if (hum !== null) c.humidity.push(hum);
            if (temp !== null) c.temperature.push(temp);
          }
        }

        if (sThreshold !== null) {
          const isStExt = value > sThreshold;
          if (isStExt) {
            if (isHaze) stationDiurnal[h]!.haze_extreme++;
            else stationDiurnal[h]!.nonhaze_extreme++;
          }
          const grp = isStExt ? stationGrouped.extreme : stationGrouped.normal;
          grp.count++;
          if (isHaze) grp.haze++;
          grp.hours[h] = (grp.hours[h] ?? 0) + 1;
          if (speed !== null) grp.wind.push(speed);
          if (hum !== null) grp.humidity.push(hum);
          if (temp !== null) grp.temperature.push(temp);

          for (const m of isHaze ? HAZE_MODES : NONHAZE_MODES) {
            const c = isStExt ? stationSplit[m].ext : stationSplit[m].norm;
            c.count++;
            c.hour.push(h);
            if (speed !== null) c.wind.push(speed);
            if (hum !== null) c.humidity.push(hum);
            if (temp !== null) c.temperature.push(temp);
          }
        }
      }

      if (dayPm25Hours.length >= 18) {
        const pmMean = mean(dayPm25Hours);
        if (pmMean !== null) {
          dailyPm25.push(pmMean);
          dailyStation.push(code);
          dailySiteType.push(siteType);
          dailyHaze.push(isHaze ? 'Karhutla' : 'Non-Karhutla');
          dailyTemp.push(dayTempHours.length > 0 ? mean(dayTempHours) ?? NaN : NaN);
          dailyHum.push(dayHumHours.length > 0 ? mean(dayHumHours) ?? NaN : NaN);
          dailyWind.push(dayWindHours.length > 0 ? mean(dayWindHours) ?? NaN : NaN);
        }
      }
    }

    const dirLabels = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    pollution_rose[code] = sectors.map((bucket, i) => ({
      direction_label: dirLabels[i] ?? '',
      mean_concentration: bucket.length >= 5 ? mean(bucket) : null,
      count: bucket.length,
    }));
    pollution_rose_meta[code] = {
      code,
      name: station.station.name,
      totalValidHours: stationValidHours,
      meanConcentration: mean(stationValuesMap[code] ?? []),
    };

    const roadDist = (station as { road?: number }).road ?? STATION_ROAD_DISTANCE[code] ?? 0;
    traffic_scatter[code] = {
      traffic_intensity_per_h: station.traffic,
      distance_to_road_m: roadDist,
      mean_concentration: mean(stationValuesMap[code] ?? []),
      mean_no2: mean(no2All),
      mean_no2_nonhaze: mean(no2Nonhaze),
      mean_co: mean(coAll),
      mean_co_nonhaze: mean(coNonhaze),
      mean_pm25: mean(pm25All),
      mean_pm25_nonhaze: mean(pm25Nonhaze),
      site_type: siteType,
    };
  }

  const correlation: DriversData['correlation'] = {};
  const modes: Record<string, CorrelationMatrix> = {};
  for (const mode of ['all', 'haze', 'nonhaze']) {
    const pairs = seasonPairs[mode] ?? [];
    const r = (index: number): number | null => {
      const pair = pairs[index];
      return pair ? spearman(pair.x, pair.y) : null;
    };
    modes[mode] = { [pollutant]: { temperature_c: r(0), humidity_pct: r(1), wind_speed_ms: r(2) } };
  }
  correlation['Pilihan'] = { all: modes['all'] ?? {}, haze: modes['haze'] ?? {}, nonhaze: modes['nonhaze'] ?? {} };

  const wind_by_site_type: Record<string, WindSiteTypeData> = {};
  const binLabels = ['0–0.5', '0.5–1', '1–2', '2–3', '3–5', '5+'];
  for (const [st, entry] of Object.entries(windBySiteTypeMap)) {
    const overallMedian = quantile(entry.allValues, 0.5);
    const bins: WindBin[] = entry.bins.map((bucket, index) => {
      const count = bucket.length;
      const [binMedian = null, p25 = null, p75 = null] = count >= 5 ? quantiles(bucket, [0.5, 0.25, 0.75]) : [];
      const ratio = binMedian !== null && overallMedian !== null && overallMedian > 0
        ? binMedian / overallMedian
        : null;
      return {
        label: binLabels[index] ?? '',
        median_concentration: binMedian,
        normalized_ratio: ratio,
        p25,
        p75,
        count,
      };
    });
    wind_by_site_type[st] = { siteType: st, overallMedian, bins };
  }

  const legacyWindBins: Record<string, readonly WindBin[]> = Object.fromEntries(
    Object.entries(wind_by_site_type).map(([st, data]) => [st, data.bins]),
  );

  const makeDiurnalHourly = (d: typeof globalDiurnal): ExtremeDiurnalHourly[] =>
    d.map(item => ({
      hour: item.hour,
      haze_prob: item.haze_valid > 0 ? (item.haze_extreme / item.haze_valid) * 100 : null,
      nonhaze_prob: item.nonhaze_valid > 0 ? (item.nonhaze_extreme / item.nonhaze_valid) * 100 : null,
      haze_extreme: item.haze_extreme,
      haze_valid: item.haze_valid,
      nonhaze_extreme: item.nonhaze_extreme,
      nonhaze_valid: item.nonhaze_valid,
    }));

  const globalStats: ExtremeStatsByThresholdMode = {
    threshold: globalThreshold,
    threshold_label: globalThreshold !== null ? `${globalThreshold.toFixed(1)} µg/m³` : '—',
    haze_season_share: globalGrouped.extreme.count ? globalGrouped.extreme.haze / globalGrouped.extreme.count : null,
    conditions: {
      all: { extreme: makeConditionMetrics(globalSplit.all.ext), normal: makeConditionMetrics(globalSplit.all.norm) },
      haze: { extreme: makeConditionMetrics(globalSplit.haze.ext), normal: makeConditionMetrics(globalSplit.haze.norm) },
      nonhaze: { extreme: makeConditionMetrics(globalSplit.nonhaze.ext), normal: makeConditionMetrics(globalSplit.nonhaze.norm) },
    },
    diurnal: makeDiurnalHourly(globalDiurnal),
    extreme: {
      median_wind_speed: quantile(globalGrouped.extreme.wind, 0.5),
      median_humidity: quantile(globalGrouped.extreme.humidity, 0.5),
      median_temperature: quantile(globalGrouped.extreme.temperature, 0.5),
      median_hour: quantile(globalSplit.all.ext.hour, 0.5),
      haze_season_share: globalGrouped.extreme.count ? globalGrouped.extreme.haze / globalGrouped.extreme.count : null,
      hour_distribution: globalGrouped.extreme.hours,
    },
    normal: {
      median_wind_speed: quantile(globalGrouped.normal.wind, 0.5),
      median_humidity: quantile(globalGrouped.normal.humidity, 0.5),
      median_temperature: quantile(globalGrouped.normal.temperature, 0.5),
      median_hour: quantile(globalSplit.all.norm.hour, 0.5),
      haze_season_share: globalGrouped.normal.count ? globalGrouped.normal.haze / globalGrouped.normal.count : null,
      hour_distribution: globalGrouped.normal.hours,
    },
  };

  const stationStats: ExtremeStatsByThresholdMode = {
    threshold: medianStationThreshold,
    threshold_label: medianStationThreshold !== null ? `Median P90: ${medianStationThreshold.toFixed(1)} µg/m³` : '—',
    haze_season_share: stationGrouped.extreme.count ? stationGrouped.extreme.haze / stationGrouped.extreme.count : null,
    conditions: {
      all: { extreme: makeConditionMetrics(stationSplit.all.ext), normal: makeConditionMetrics(stationSplit.all.norm) },
      haze: { extreme: makeConditionMetrics(stationSplit.haze.ext), normal: makeConditionMetrics(stationSplit.haze.norm) },
      nonhaze: { extreme: makeConditionMetrics(stationSplit.nonhaze.ext), normal: makeConditionMetrics(stationSplit.nonhaze.norm) },
    },
    diurnal: makeDiurnalHourly(stationDiurnal),
    extreme: {
      median_wind_speed: quantile(stationGrouped.extreme.wind, 0.5),
      median_humidity: quantile(stationGrouped.extreme.humidity, 0.5),
      median_temperature: quantile(stationGrouped.extreme.temperature, 0.5),
      median_hour: quantile(stationSplit.all.ext.hour, 0.5),
      haze_season_share: stationGrouped.extreme.count ? stationGrouped.extreme.haze / stationGrouped.extreme.count : null,
      hour_distribution: stationGrouped.extreme.hours,
    },
    normal: {
      median_wind_speed: quantile(stationGrouped.normal.wind, 0.5),
      median_humidity: quantile(stationGrouped.normal.humidity, 0.5),
      median_temperature: quantile(stationGrouped.normal.temperature, 0.5),
      median_hour: quantile(stationSplit.all.norm.hour, 0.5),
      haze_season_share: stationGrouped.normal.count ? stationGrouped.normal.haze / stationGrouped.normal.count : null,
      hour_distribution: stationGrouped.normal.hours,
    },
  };

  const etaHaze = etaSquared(dailyHaze, dailyPm25);
  const etaStation = etaSquared(dailyStation, dailyPm25);
  const etaSiteType = etaSquared(dailySiteType, dailyPm25);
  const etaHour = etaSquared(hourlyHour, hourlyPm25);

  const cleanDaily = (rawX: readonly number[], rawY: readonly number[]) => {
    const xClean: number[] = [], yClean: number[] = [];
    for (let i = 0; i < rawX.length; i++) {
      const x = rawX[i], y = rawY[i];
      if (x !== undefined && y !== undefined && Number.isFinite(x) && Number.isFinite(y)) {
        xClean.push(x); yClean.push(y);
      }
    }
    return { x: xClean, y: yClean };
  };

  const tempPairs = cleanDaily(dailyTemp, dailyPm25);
  const humPairs = cleanDaily(dailyHum, dailyPm25);
  const windPairs = cleanDaily(dailyWind, dailyPm25);

  const r2Temp = pearson(tempPairs.x, tempPairs.y);
  const r2Hum = pearson(humPairs.x, humPairs.y);
  const r2Wind = pearson(windPairs.x, windPairs.y);

  const driverRankings: DriverRankingItem[] = [
    {
      id: 'station',
      label: 'Stasiun (Lokasi Spesifik)',
      factorType: 'categorical' as const,
      metricName: 'η²' as const,
      varianceExplained: etaStation,
      interpretation: 'Perbedaan emisi lokal & baseline antarstasiun',
    },
    {
      id: 'site_type',
      label: 'Tipe Lokasi (Zonasi Wilayah)',
      factorType: 'categorical' as const,
      metricName: 'η²' as const,
      varianceExplained: etaSiteType,
      interpretation: 'Zonasi perkotaan, industri, gambut vs latar bersih',
    },
    {
      id: 'haze_season',
      label: 'Musim Karhutla (Agu–Okt)',
      factorType: 'categorical' as const,
      metricName: 'η²' as const,
      varianceExplained: etaHaze,
      interpretation: 'Episode musiman kebakaran hutan dan lahan gambut',
    },
    {
      id: 'wind_speed',
      label: 'Kecepatan Angin Harian',
      factorType: 'continuous' as const,
      metricName: 'R²' as const,
      varianceExplained: r2Wind.r2,
      r: r2Wind.r ?? undefined,
      interpretation: 'Ventilasi dan dispersi atmosfer (korelasi negatif)',
    },
    {
      id: 'temperature',
      label: 'Suhu Udara Harian',
      factorType: 'continuous' as const,
      metricName: 'R²' as const,
      varianceExplained: r2Temp.r2,
      r: r2Temp.r ?? undefined,
      interpretation: 'Pengaruh radiasi matahari dan inversi termal',
    },
    {
      id: 'diurnal_hour',
      label: 'Jam Hari (Siklus Diurnal)',
      factorType: 'categorical' as const,
      metricName: 'η²' as const,
      varianceExplained: etaHour,
      interpretation: 'Variasi jam 00–23 WIB (puncak pagi & sore)',
    },
    {
      id: 'humidity',
      label: 'Kelembapan Relatif Harian',
      factorType: 'continuous' as const,
      metricName: 'R²' as const,
      varianceExplained: r2Hum.r2,
      r: r2Hum.r ?? undefined,
      interpretation: 'Pertumbuhan higroskopis partikel dan kabut basah',
    },
  ].sort((a, b) => b.varianceExplained - a.varianceExplained);

  return {
    meta: {
      version: 2,
      date_range: { start: dates[0] ?? '', end: dates.at(-1) ?? '' },
      haze_months: [8, 9, 10],
      calm_wind_threshold_ms: 0.5,
      correlation_min_obs: 30,
      extreme_percentile: 90,
      pollutant,
    },
    pollution_rose,
    pollution_rose_meta,
    correlation,
    wind_bins: legacyWindBins,
    wind_by_site_type,
    traffic_scatter,
    extreme_vs_normal: {
      threshold: globalStats.threshold,
      extreme: globalStats.extreme,
      normal: globalStats.normal,
    },
    extreme_modes: {
      global: globalStats,
      station: stationStats,
    },
    driver_rankings: driverRankings,
  };
}
