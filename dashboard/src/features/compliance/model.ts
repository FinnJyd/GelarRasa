import type { FilterState, PollutantName, Station } from '../../data/types';
import { REFERENCES, selectedPollutant } from './pollutants';
import type { ChangePattern, ComplianceData, ComplianceRow, StationComparison, YearComparison } from './types';

export function categoryIndex(value: number, pollutant: PollutantName = 'PM2.5'): number {
  const index = REFERENCES[pollutant].bins.findIndex(limit => value <= limit);
  return index < 0 ? 4 : index;
}
export function selectRows(data: ComplianceData, catalog: readonly Station[], state: FilterState): ComplianceRow[] {
  const start = state.startDate ?? data.dates[0] ?? '';
  const end = state.endDate ?? data.dates[data.dates.length - 1] ?? '';
  const indices = data.dates.flatMap((day, i) => day >= start && day <= end ? [i] : []);
  const pollutant = selectedPollutant(state);
  const reference = REFERENCES[pollutant];
  return catalog.filter(station => (state.region === 'all' || state.region === station.region)
    && (state.siteType === 'all' || state.siteType === station.siteType) && (state.station === 'all' || state.station === station.code)).map(station => {
    const source = data.stations[station.code]?.pollutants[pollutant];
    const values = source?.[state.includeSuspect ? 's' : 'v'];
    const comparisons = reference.hours === 8 ? source?.max8?.[state.includeSuspect ? 's' : 'v'] : values;
    let sum = 0;
    let days = 0;
    let exceed = 0;
    let comparisonDays = 0;
    const categories = [0, 0, 0, 0, 0];
    for (const i of indices) {
      const comparison = comparisons?.[i];
      if (comparison !== null && comparison !== undefined) {
        comparisonDays++;
        if (comparison > reference.daily) exceed++;
      }
      const value = values?.[i];
      if (value === null || value === undefined) continue;
      sum += value;
      days++;
      const category = categoryIndex(value, pollutant);
      categories[category] = (categories[category] ?? 0) + 1;
    }
    return { station, mean: days ? sum / days : null, days, comparisonDays, exceed, categories, reason: source?.reason ?? 'Stasiun tidak tersedia dalam ekspor.' };
  }).sort((a, b) => (b.mean ?? -1) - (a.mean ?? -1) || a.station.code.localeCompare(b.station.code));
}
export function stationComparisons(data: ComplianceData, catalog: readonly Station[], state: FilterState): StationComparison[] {
  const stations = new Map<string, { station: Station; years: YearComparison[] }>();
  for (const year of [2024, 2025, 2026]) {
    const rows = selectRows(data, catalog, { ...state, startDate: `${year}-01-01`, endDate: `${year}-10-14` });
    for (const row of rows) {
      const result = stations.get(row.station.code) ?? { station: row.station, years: [] };
      result.years.push({ year, days: row.comparisonDays, exceed: row.exceed, rate: row.comparisonDays ? row.exceed / row.comparisonDays * 100 : null });
      stations.set(row.station.code, result);
    }
  }
  return [...stations.values()].map(row => {
    const first = row.years[0]?.rate ?? null;
    const middle = row.years[1]?.rate ?? null;
    const last = row.years[2]?.rate ?? null;
    const change2425 = first === null || middle === null ? null : middle - first;
    const change2526 = middle === null || last === null ? null : last - middle;
    const change2426 = first === null || last === null ? null : last - first;
    const pattern: ChangePattern = change2425 === null || change2526 === null ? 'Data tidak lengkap'
      : change2425 < 0 && change2526 < 0 ? 'Membaik konsisten'
      : change2425 > 0 && change2526 > 0 ? 'Memburuk konsisten'
      : change2425 === 0 && change2526 === 0 ? 'Tetap' : 'Berfluktuasi';
    return { ...row, change2425, change2526, change2426, pattern };
  }).sort((a, b) => {
    if (a.change2426 === null && b.change2426 !== null) return 1;
    if (b.change2426 === null && a.change2426 !== null) return -1;
    return Math.abs(b.change2426 ?? 0) - Math.abs(a.change2426 ?? 0) || a.station.code.localeCompare(b.station.code);
  });
}

export function defaultComparisonCodes(rows: readonly StationComparison[]): string[] {
  const preferred = ['AQMS-SM2-01', 'AQMS-KTG-01', 'AQMS-PLB-01', 'AQMS-BJB-01'];
  const available = new Set(rows.map(row => row.station.code));
  const initial = preferred.filter(code => available.has(code));
  const remaining = rows.filter(row => !initial.includes(row.station.code)).sort((a, b) =>
    Number(b.years.some(year => year.rate !== null)) - Number(a.years.some(year => year.rate !== null)) || a.station.code.localeCompare(b.station.code));
  return [...initial, ...remaining.map(row => row.station.code)].slice(0, 4);
}
export function splitRankings(rows: readonly ComplianceRow[]): { high: ComplianceRow[]; low: ComplianceRow[] } {
  const eligible = rows.filter(row => row.mean !== null);
  const count = Math.min(10, Math.ceil(eligible.length / 2));
  return { high: eligible.slice(0, count), low: eligible.slice(count).slice(-10).reverse() };
}

export type CategoryView = 'priority' | 'all';
export function distributionRows(rows: readonly ComplianceRow[], view: CategoryView): ComplianceRow[] {
  const severityShare = (row: ComplianceRow): number => row.categories.slice(2).reduce((sum, count) => sum + count, 0) / row.days;
  const ordered = rows.filter(row => row.mean !== null && row.days > 0)
    .sort((a, b) => severityShare(b) - severityShare(a) || a.station.code.localeCompare(b.station.code));
  return view === 'priority' ? ordered.slice(0, 10) : ordered;
}

export type AnnualView = 'top' | 'all';
export function annualDisplayRows(rows: readonly ComplianceRow[], view: AnnualView): ComplianceRow[] {
  const measured = rows.filter(row => row.mean !== null).sort((a, b) => (b.mean ?? -1) - (a.mean ?? -1) || a.station.code.localeCompare(b.station.code));
  return view === 'top' ? measured.slice(0, 10) : measured;
}

export function calendarDaysInYear(year: string): number {
  return (Date.parse(`${Number(year) + 1}-01-01`) - Date.parse(`${year}-01-01`)) / 86400000;
}

export function annualAssessment(row: ComplianceRow, year: string, lastDate: string, pollutant: PollutantName = 'PM2.5'): 'unavailable' | 'partial' | 'above' | 'within' {
  const reference = REFERENCES[pollutant].annual;
  if (row.mean === null || reference === null) return 'unavailable';
  const expected = calendarDaysInYear(year);
  if (`${year}-12-31` > lastDate || row.days / expected < .75) return 'partial';
  return row.mean > reference ? 'above' : 'within';
}
