import type {
  CorrelationMatrix,
  CorrelationRow,
  DirectionSector,
  DriversData,
  DriversMeta,
  ExtremeStats,
  ExtremeVsNormal,
  StationCorrelation,
  TrafficStationData,
  WindBin,
} from './types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requireRecord(value: unknown, label: string): Record<string, unknown> {
  if (!isRecord(value)) throw new Error(`${label}: objek tidak valid.`);
  return value;
}

function requireNumber(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error(`${label}: angka tidak valid.`);
  return value;
}

function requireString(value: unknown, label: string): string {
  if (typeof value !== 'string') throw new Error(`${label}: string tidak valid.`);
  return value;
}

function requireArray(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value)) throw new Error(`${label}: array tidak valid.`);
  return value;
}

function parseDirectionSector(value: unknown, label: string): DirectionSector {
  const rec = requireRecord(value, label);
  const meanVal = rec['mean_pm25'];
  return {
    direction_label: requireString(rec['direction_label'], `${label}.direction_label`),
    mean_pm25: meanVal === null || meanVal === undefined ? null : requireNumber(meanVal, `${label}.mean_pm25`),
    count: requireNumber(rec['count'], `${label}.count`),
  };
}

function parsePollutionRose(value: unknown): Record<string, readonly DirectionSector[]> {
  const outer = requireRecord(value, 'pollution_rose');
  const result: Record<string, readonly DirectionSector[]> = {};
  for (const [station, arr] of Object.entries(outer)) {
    const list = requireArray(arr, `pollution_rose.${station}`);
    result[station] = list.map((item, i) => parseDirectionSector(item, `pollution_rose.${station}[${i}]`));
  }
  return result;
}

function parseCorrelationRow(value: unknown, label: string): CorrelationRow {
  const rec = requireRecord(value, label);
  const getOptNum = (v: unknown, sub: string): number | null =>
    v === null || v === undefined ? null : requireNumber(v, `${label}.${sub}`);
  return {
    temperature_c: getOptNum(rec['temperature_c'], 'temperature_c'),
    humidity_pct: getOptNum(rec['humidity_pct'], 'humidity_pct'),
    wind_speed_ms: getOptNum(rec['wind_speed_ms'], 'wind_speed_ms'),
  };
}

function parseCorrelationMatrix(value: unknown, label: string): CorrelationMatrix {
  const outer = requireRecord(value, label);
  const result: CorrelationMatrix = {};
  for (const [pollutant, row] of Object.entries(outer)) {
    result[pollutant] = parseCorrelationRow(row, `${label}.${pollutant}`);
  }
  return result;
}

function parseCorrelation(value: unknown): Record<string, StationCorrelation> {
  const outer = requireRecord(value, 'correlation');
  const result: Record<string, StationCorrelation> = {};
  for (const [station, modes] of Object.entries(outer)) {
    const modeRec = requireRecord(modes, `correlation.${station}`);
    result[station] = {
      all: parseCorrelationMatrix(modeRec['all'], `correlation.${station}.all`),
      haze: parseCorrelationMatrix(modeRec['haze'], `correlation.${station}.haze`),
      nonhaze: parseCorrelationMatrix(modeRec['nonhaze'], `correlation.${station}.nonhaze`),
    };
  }
  return result;
}

function parseWindBin(value: unknown, label: string): WindBin {
  const rec = requireRecord(value, label);
  const getOptNum = (v: unknown, sub: string): number | null =>
    v === null || v === undefined ? null : requireNumber(v, `${label}.${sub}`);
  return {
    label: requireString(rec['label'], `${label}.label`),
    median_pm25: getOptNum(rec['median_pm25'], 'median_pm25'),
    p25: getOptNum(rec['p25'], 'p25'),
    p75: getOptNum(rec['p75'], 'p75'),
    count: requireNumber(rec['count'], `${label}.count`),
  };
}

function parseWindBins(value: unknown): Record<string, readonly WindBin[]> {
  const outer = requireRecord(value, 'wind_bins');
  const result: Record<string, readonly WindBin[]> = {};
  for (const [siteType, arr] of Object.entries(outer)) {
    const list = requireArray(arr, `wind_bins.${siteType}`);
    result[siteType] = list.map((item, i) => parseWindBin(item, `wind_bins.${siteType}[${i}]`));
  }
  return result;
}

function parseTrafficScatter(value: unknown): Record<string, TrafficStationData> {
  const outer = requireRecord(value, 'traffic_scatter');
  const result: Record<string, TrafficStationData> = {};
  for (const [station, data] of Object.entries(outer)) {
    const rec = requireRecord(data, `traffic_scatter.${station}`);
    const no2 = rec['mean_no2'];
    const co = rec['mean_co'];
    result[station] = {
      traffic_intensity_per_h: requireNumber(rec['traffic_intensity_per_h'], `${station}.traffic_intensity`),
      mean_no2: no2 === null || no2 === undefined ? null : requireNumber(no2, `${station}.mean_no2`),
      mean_co: co === null || co === undefined ? null : requireNumber(co, `${station}.mean_co`),
      site_type: requireString(rec['site_type'], `${station}.site_type`),
    };
  }
  return result;
}

function parseExtremeStats(value: unknown, label: string): ExtremeStats {
  const rec = requireRecord(value, label);
  const rawHours = requireArray(rec['hour_distribution'], `${label}.hour_distribution`);
  return {
    median_wind_speed: requireNumber(rec['median_wind_speed'], `${label}.median_wind_speed`),
    median_humidity: requireNumber(rec['median_humidity'], `${label}.median_humidity`),
    median_temperature: requireNumber(rec['median_temperature'], `${label}.median_temperature`),
    haze_season_share: requireNumber(rec['haze_season_share'], `${label}.haze_season_share`),
    hour_distribution: rawHours.map((h, i) => requireNumber(h, `${label}.hour_distribution[${i}]`)),
  };
}

function parseExtremeVsNormal(value: unknown): ExtremeVsNormal {
  const rec = requireRecord(value, 'extreme_vs_normal');
  return {
    threshold_pm25: requireNumber(rec['threshold_pm25'], 'extreme_vs_normal.threshold_pm25'),
    extreme: parseExtremeStats(rec['extreme'], 'extreme_vs_normal.extreme'),
    normal: parseExtremeStats(rec['normal'], 'extreme_vs_normal.normal'),
  };
}

function parseMeta(value: unknown): DriversMeta {
  const rec = requireRecord(value, 'meta');
  const dateRange = requireRecord(rec['date_range'], 'meta.date_range');
  const rawHazeMonths = requireArray(rec['haze_months'], 'meta.haze_months');
  return {
    version: requireNumber(rec['version'], 'meta.version'),
    date_range: {
      start: requireString(dateRange['start'], 'meta.date_range.start'),
      end: requireString(dateRange['end'], 'meta.date_range.end'),
    },
    haze_months: rawHazeMonths.map((m, i) => requireNumber(m, `meta.haze_months[${i}]`)),
    calm_wind_threshold_ms: requireNumber(rec['calm_wind_threshold_ms'], 'meta.calm_wind_threshold_ms'),
    correlation_min_obs: requireNumber(rec['correlation_min_obs'], 'meta.correlation_min_obs'),
    extreme_percentile: requireNumber(rec['extreme_percentile'], 'meta.extreme_percentile'),
  };
}

function parseDrivers(raw: unknown): DriversData {
  const rec = requireRecord(raw, 'tab4_drivers');
  return {
    meta: parseMeta(rec['meta']),
    pollution_rose: parsePollutionRose(rec['pollution_rose']),
    correlation: parseCorrelation(rec['correlation']),
    wind_bins: parseWindBins(rec['wind_bins']),
    traffic_scatter: parseTrafficScatter(rec['traffic_scatter']),
    extreme_vs_normal: parseExtremeVsNormal(rec['extreme_vs_normal']),
  };
}

let cached: DriversData | null = null;

export async function loadDrivers(signal: AbortSignal): Promise<DriversData> {
  if (cached) return cached;
  const request = new AbortController();
  const combined = AbortSignal.any([signal, request.signal]);
  try {
    const response = await fetch('./data/tab4_drivers.json', { signal: combined });
    if (!response.ok) throw new Error(`Ekspor drivers tidak tersedia (${response.status}).`);
    const raw: unknown = await response.json();
    if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
    cached = parseDrivers(raw);
    return cached;
  } finally {
    request.abort();
  }
}

