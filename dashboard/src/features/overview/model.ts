import { CATEGORIES } from '../../data/types';
import { hasMeasurements } from '../../data/observations';
import type { Category, DailyCube, FilterState, MeasuredStationObservation, Station, StationObservation } from '../../data/types';

export const defaultFilters = (): FilterState => ({
  region: 'all',
  siteType: 'all',
  station: 'all',
  periodPreset: 'all',
  startDate: '2024-01-01',
  endDate: '2026-10-14',
  pollutant: 'PM2.5',
  includeSuspect: false,
});

export function filterStations(stations: readonly Station[], state: FilterState): Station[] {
  return stations.filter(station =>
    (state.region === 'all' || station.region === state.region) &&
    (state.siteType === 'all' || station.siteType === state.siteType) &&
    (state.station === 'all' || station.code === state.station),
  ).sort((a, b) => b.average - a.average || a.code.localeCompare(b.code));
}

export function selectObservations(stations: readonly Station[], state: FilterState, cube: DailyCube | undefined): StationObservation[] {
  const start = state.startDate ?? cube?.dates[0] ?? '';
  const end = state.endDate ?? cube?.dates[cube.dates.length - 1] ?? '';
  const indices = cube?.dates.flatMap((day, i) => day >= start && day <= end ? [i] : []) ?? [];
  const key = (state.pollutant ?? 'PM2.5').toLowerCase().replace('.', '');
  const threshold = cube?.thresholds[key];
  const mode = state.includeSuspect ? 's' : 'v';
  return filterStations(stations, state).map(station => {
    const source = cube?.stations[station.code];
    const series = source?.[mode][key];
    const comparisons = (key === 'co' || key === 'o3') && source?.m8 ? source.m8[mode][key] ?? series : series;
    const unsupported = source?.unavailable.includes(key) ?? false;
    let sum = 0; let count = 0; let exceed = 0; let comparisonDays = 0;
    const counts: Record<Category, number> = { Baik: 0, Sedang: 0, 'Tidak Sehat': 0, 'Sangat Tidak Sehat': 0, Berbahaya: 0 };
    if (series && threshold && !unsupported) for (const i of indices) {
      const value = series[i];
      if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) continue;
      sum += value; count++;
      const compValue = comparisons ? comparisons[i] : value;
      if (typeof compValue === 'number' && Number.isFinite(compValue) && compValue >= 0) {
        comparisonDays++;
        if (compValue > threshold.pp22_24h) exceed++;
        const category = compValue <= (threshold.ispu_bins[1] ?? 15.5) ? 'Baik'
          : compValue <= (threshold.ispu_bins[2] ?? 55.4) ? 'Sedang'
          : compValue <= (threshold.ispu_bins[3] ?? 150.4) ? 'Tidak Sehat'
          : compValue <= (threshold.ispu_bins[4] ?? 250.4) ? 'Sangat Tidak Sehat' : 'Berbahaya';
        counts[category]++;
      }
    }
    let category: Category | null = null;
    if (count) for (const candidate of CATEGORIES) if (category === null || counts[candidate] > counts[category]) category = candidate;
    const unavailableReason = count ? null : !cube || !source || !series || !threshold ? 'Ekspor harian polutan tidak tersedia.'
      : unsupported ? 'Satuan polutan belum didukung.' : !indices.length ? 'Tidak ada tanggal pengamatan dalam rentang pilihan.'
      : 'Tidak ada hari terukur yang memenuhi syarat ekspor pada pilihan ini.';
    const exceedDenominator = comparisonDays || count;
    return { ...station, average: count ? Number((sum / count).toFixed(1)) : null,
      exceedance: exceedDenominator ? Number((exceed / exceedDenominator * 100).toFixed(1)) : null, category,
      validPercentage: indices.length ? Number((count / indices.length * 100).toFixed(1)) : 0,
      measuredDays: count, periodDays: indices.length, unavailableReason };
  }).sort((a, b) => (b.average ?? -1) - (a.average ?? -1) || a.code.localeCompare(b.code));
}

export function computeHospitalBurden(
  cube: DailyCube,
  start?: string,
  end?: string,
  selectedStationCodes?: readonly string[],
): {
  burden: number;
  dailyAdmissions: number;
  beds: number;
  hospitalName?: string | undefined;
  hospitalCount: number;
} {
  const allDates = cube.dates;
  const s = start ?? '2024-01-01';
  const e = end ?? '2026-10-14';
  let startIndex = allDates.findIndex(d => d >= s);
  if (startIndex === -1) startIndex = 0;
  let endIndex = allDates.length - 1;
  for (let i = allDates.length - 1; i >= 0; i--) {
    const d = allDates[i];
    if (d !== undefined && d <= e) {
      endIndex = i;
      break;
    }
  }
  const count = endIndex >= startIndex ? endIndex - startIndex + 1 : 1;

  const byStation = cube.health_daily.by_station;
  if (selectedStationCodes !== undefined && byStation) {
    if (selectedStationCodes.length === 0) {
      return { burden: 0, dailyAdmissions: 0, beds: 0, hospitalCount: 0 };
    }
    if (selectedStationCodes.length < cube.health_daily.total_hospitals) {
      let totalBeds = 0;
      let totalAdmissionsSum = 0;
      let matchingCount = 0;
      let singleHospitalName: string | undefined;

      for (const stCode of selectedStationCodes) {
        const h = byStation[stCode];
        if (h) {
          totalBeds += h.beds;
          const subSlice = h.admissions.slice(startIndex, endIndex + 1);
          totalAdmissionsSum += subSlice.reduce((acc, val) => acc + val, 0);
          matchingCount++;
          if (matchingCount === 1) singleHospitalName = h.hospital_name;
        }
      }

      const daily = totalAdmissionsSum / count;
      const burden = totalBeds > 0 ? (daily / totalBeds) * 100 : 0;
      return {
        burden: Number(burden.toFixed(2)),
        dailyAdmissions: Number(daily.toFixed(1)),
        beds: totalBeds,
        hospitalName: matchingCount === 1 ? singleHospitalName : undefined,
        hospitalCount: matchingCount,
      };
    }
  }

  const slice = cube.health_daily.admissions_by_date.slice(startIndex, endIndex + 1);
  const sum = slice.reduce((acc, val) => acc + val, 0);
  const daily = sum / count;
  const beds = cube.health_daily.total_bed_capacity;
  const burden = beds > 0 ? (daily / beds) * 100 : 0;
  return {
    burden: Number(burden.toFixed(2)),
    dailyAdmissions: Number(daily.toFixed(1)),
    beds,
    hospitalCount: cube.health_daily.total_hospitals,
  };
}

export function summarize(stations: readonly StationObservation[]): {
  mean: number | null;
  validMean: number | null;
  exceedanceMean: number | null;
  highest: MeasuredStationObservation | null;
  measured: number;
  distribution: { category: Category; count: number }[];
} {
  const measured = stations.filter(hasMeasurements);
  return {
    measured: measured.length,
    mean: measured.length ? measured.reduce((sum, station) => sum + station.average, 0) / measured.length : null,
    validMean: measured.length ? measured.reduce((sum, station) => sum + station.validPercentage, 0) / measured.length : null,
    exceedanceMean: measured.length ? measured.reduce((sum, station) => sum + station.exceedance, 0) / measured.length : null,
    highest: measured.reduce<MeasuredStationObservation | null>((highest, station) =>
      highest === null || station.average > highest.average ? station : highest, null),
    distribution: CATEGORIES.map(category => ({
      category,
      count: measured.filter(station => station.category === category).length,
    })),
  };
}

export function rankingGroups(stations: readonly Station[]): { high: Station[]; low: Station[] } {
  const sorted = [...stations].sort((a, b) => b.average - a.average || a.code.localeCompare(b.code));
  const highCount = Math.min(10, Math.ceil(sorted.length / 2));
  return {
    high: sorted.slice(0, highCount),
    low: sorted.slice(highCount).slice(-10).reverse(),
  };
}
