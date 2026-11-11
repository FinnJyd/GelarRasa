import { CATEGORIES } from '../../data/types';
import type { Category, DailyCube, FilterState, Station } from '../../data/types';

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

export function filterStations(stations: readonly Station[], state: FilterState, cube?: DailyCube): Station[] {
  let list = stations;

  if (cube) {
    const allDates = cube.dates;
    const start = state.startDate ?? '2024-01-01';
    const end = state.endDate ?? '2026-10-14';

    let startIndex = allDates.findIndex(d => d >= start);
    if (startIndex === -1) startIndex = 0;
    let endIndex = -1;
    for (let i = allDates.length - 1; i >= 0; i--) {
      const d = allDates[i];
      if (d !== undefined && d <= end) {
        endIndex = i;
        break;
      }
    }
    if (endIndex === -1) endIndex = allDates.length - 1;
    if (startIndex > endIndex) {
      const temp = startIndex;
      startIndex = endIndex;
      endIndex = temp;
    }

    const pollutantName = state.pollutant ?? 'PM2.5';
    const polKey = pollutantName.toLowerCase().replace('.', '');
    const threshold = cube.thresholds[polKey] ?? cube.thresholds['pm25'];
    const limit24h = threshold?.pp22_24h ?? 55.0;
    const bins = threshold?.ispu_bins ?? [0.0, 15.5, 55.4, 150.4, 250.4];
    const qcMode = state.includeSuspect ? 's' : 'v';
    const totalDays = endIndex - startIndex + 1;

    list = stations.map(station => {
      const stRecord = cube.stations[station.code];
      const series = stRecord?.[qcMode]?.[polKey];
      if (!series) return station;

      let sum = 0;
      let count = 0;
      let exceedCount = 0;
      const catCounts: Record<Category, number> = {
        Baik: 0,
        Sedang: 0,
        'Tidak Sehat': 0,
        'Sangat Tidak Sehat': 0,
        Berbahaya: 0,
      };

      for (let d = startIndex; d <= endIndex; d++) {
        const val = series[d];
        if (val !== null && val !== undefined) {
          sum += val;
          count++;
          if (val > limit24h) exceedCount++;
          let dayCat: Category = 'Berbahaya';
          if (val <= (bins[1] ?? 15.5)) dayCat = 'Baik';
          else if (val <= (bins[2] ?? 55.4)) dayCat = 'Sedang';
          else if (val <= (bins[3] ?? 150.4)) dayCat = 'Tidak Sehat';
          else if (val <= (bins[4] ?? 250.4)) dayCat = 'Sangat Tidak Sehat';
          catCounts[dayCat]++;
        }
      }

      let dominantCat: Category = 'Baik';
      let maxCatCount = -1;
      for (const cat of CATEGORIES) {
        const c = catCounts[cat] ?? 0;
        if (c > maxCatCount) {
          maxCatCount = c;
          dominantCat = cat;
        }
      }

      const avg = count > 0 ? Number((sum / count).toFixed(1)) : 0;
      const exceedPct = count > 0 ? Number(((exceedCount / count) * 100).toFixed(1)) : 0;
      const validPct = totalDays > 0 ? Number(((count / totalDays) * 100).toFixed(1)) : 0;

      return {
        ...station,
        average: avg,
        exceedance: exceedPct,
        validPercentage: validPct,
        category: dominantCat,
      };
    });
  }

  return list.filter(station =>
    (state.region === 'all' || station.region === state.region) &&
    (state.siteType === 'all' || station.siteType === state.siteType) &&
    (state.station === 'all' || station.code === state.station),
  ).sort((a, b) => b.average - a.average || a.code.localeCompare(b.code));
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

export function summarize(stations: readonly Station[]): {
  mean: number | null;
  validMean: number | null;
  exceedanceMean: number | null;
  highest: Station | null;
  distribution: { category: Category; count: number }[];
} {
  return {
    mean: stations.length ? stations.reduce((sum, station) => sum + station.average, 0) / stations.length : null,
    validMean: stations.length ? stations.reduce((sum, station) => sum + station.validPercentage, 0) / stations.length : null,
    exceedanceMean: stations.length ? stations.reduce((sum, station) => sum + station.exceedance, 0) / stations.length : null,
    highest: stations.reduce<Station | null>((highest, station) =>
      highest === null || station.average > highest.average ? station : highest, null),
    distribution: CATEGORIES.map(category => ({
      category,
      count: stations.filter(station => station.category === category).length,
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
