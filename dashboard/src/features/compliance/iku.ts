import type { FilterState, Station } from '../../data/types';
import type { ComplianceData, IkuRow } from './types';

export function ikuScore(no2: number, so2: number): number {
  return 100 - 50 / .9 * ((no2 / 40 + so2 / 20) / 2 - .1);
}

export function ikuCategory(value: number): string {
  if (value < 0 || value > 100) return 'Di luar rentang 0–100';
  return value >= 90 ? 'Sangat Baik' : value >= 70 ? 'Baik' : value >= 50 ? 'Sedang' : value >= 25 ? 'Kurang' : 'Sangat Kurang';
}

export function estimateIku(data: ComplianceData, catalog: readonly Station[], state: FilterState): IkuRow[] {
  const start = state.startDate ?? data.dates[0] ?? '';
  const end = state.endDate ?? data.dates[data.dates.length - 1] ?? '';
  const indices = data.dates.flatMap((date, i) => date >= start && date <= end ? [i] : []);
  const results: IkuRow[] = [];
  const mode = state.includeSuspect ? 's' : 'v';
  for (const station of catalog) {
    if ((state.region !== 'all' && station.region !== state.region) || (state.station !== 'all' && station.code !== state.station)
      || (state.siteType !== 'all' && station.siteType !== state.siteType)) continue;
    const source = data.stations[station.code]?.pollutants;
    let no2 = 0; let so2 = 0; let days = 0;
    for (const i of indices) {
      const n = source?.NO2[mode][i]; const s = source?.SO2[mode][i];
      if (n === null || n === undefined || s === null || s === undefined) continue;
      no2 += n; so2 += s; days++;
    }
    const meanNo2 = days ? no2 / days : null;
    const meanSo2 = days ? so2 / days : null;
    results.push({ station, no2: meanNo2, so2: meanSo2, score: meanNo2 === null || meanSo2 === null ? null : ikuScore(meanNo2, meanSo2), days });
  }
  return results.sort((a, b) => (a.score ?? Infinity) - (b.score ?? Infinity) || a.station.code.localeCompare(b.station.code));
}
