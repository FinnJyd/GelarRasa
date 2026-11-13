import type { FilterState, Station } from '../../data/types';
import { number } from '../../shared/format';
import { healthInsights } from './insights';
import { POLLUTANT_KEYS } from './types';
import type { ExposureBin, HealthData, HealthSummary, Outcome, PollutantKey } from './types';

export function pollutantKey(name: string | undefined): PollutantKey | null {
  const key = (name ?? 'PM2.5').toLowerCase().replace('.', '');
  return POLLUTANT_KEYS.find(item => item === key) ?? null;
}
export const mean = (values: readonly number[]): number | null => values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
export function correlation(x: readonly number[], y: readonly number[]): number | null {
  if (x.length < 30 || x.length !== y.length) return null;
  const mx = mean(x);
  const my = mean(y);
  if (mx === null || my === null) return null;
  let xx = 0, yy = 0, xy = 0;
  for (let i = 0; i < x.length; i++) {
    const a = x[i], b = y[i];
    if (a === undefined || b === undefined) return null;
    xx += (a - mx) ** 2; yy += (b - my) ** 2; xy += (a - mx) * (b - my);
  }
  return xx > 0 && yy > 0 ? Math.max(-1, Math.min(1, xy / Math.sqrt(xx * yy))) : null;
}
export function summarizeHealth(data: HealthData, catalog: readonly Station[], filters: FilterState, outcome: Outcome): HealthSummary {
  const key = pollutantKey(filters.pollutant);
  const selected = catalog.filter(station => (filters.region === 'all' || station.region === filters.region)
    && (filters.siteType === 'all' || station.siteType === filters.siteType)
    && (filters.station === 'all' || station.code === filters.station))
    .flatMap(station => { const item = data.stations[station.code]; return item ? [item] : []; });
  const indices = data.dates.flatMap((date, index) => date >= (filters.startDate ?? data.dates[0] ?? '')
    && date <= (filters.endDate ?? data.dates.at(-1) ?? '') ? [index] : []);
  const mode = filters.includeSuspect ? 's' : 'v';
  const dates = indices.map(i => data.dates[i] ?? '');
  const daily: (number | null)[] = [], exposure: (number | null)[] = [], burden: (number | null)[] = [];
  const coverageByDay: number[] = [], ages5: number[] = [], ages60: number[] = [];
  const paired: { x: number; y: number; facility: string }[] = [];
  const beds = selected.reduce((sum, item) => sum + item.beds, 0);
  for (const i of indices) {
    const outcomes: number[] = [], observations: number[] = [], young: number[] = [], old: number[] = [];
    for (const item of selected) {
      const y = item.outcomes[outcome][i];
      const x = key ? item.exposure[mode][key][i] : null;
      if (y !== null && y !== undefined) outcomes.push(y);
      if (x !== null && x !== undefined) observations.push(x);
      if (y !== null && y !== undefined && x !== null && x !== undefined) paired.push({ x, y, facility: item.hospital });
      const under = item.outcomes.resp_admissions_under5[i], over = item.outcomes.resp_admissions_over60[i];
      if (under !== null && under !== undefined) young.push(under);
      if (over !== null && over !== undefined) old.push(over);
    }
    // Partial facility totals would change the denominator without the reader noticing.
    const total = selected.length > 0 && outcomes.length === selected.length ? outcomes.reduce((a, b) => a + b, 0) : null;
    daily.push(total); exposure.push(mean(observations)); coverageByDay.push(observations.length);
    const respiratory = selected.map(item => item.outcomes.resp[i]);
    burden.push(beds > 0 && respiratory.every((n): n is number => n !== null && n !== undefined)
      ? respiratory.reduce((a, b) => a + b, 0) / beds * 100 : null);
    if (young.length === selected.length && young.length) ages5.push(young.reduce((a, b) => a + b, 0));
    if (old.length === selected.length && old.length) ages60.push(old.reduce((a, b) => a + b, 0));
  }
  const lags = Array.from({ length: 8 }, (_, lag) => {
    const rs: number[] = [];
    let pairs = 0;
    for (const item of selected) {
      const xs: number[] = [], ys: number[] = [];
      for (const i of indices) {
        const x = key && i >= lag ? item.exposure[mode][key][i - lag] : null;
        const y = item.outcomes[outcome][i];
        if (x !== null && x !== undefined && y !== null && y !== undefined) { xs.push(x); ys.push(y); }
      }
      const r = correlation(xs, ys);
      if (r !== null) { rs.push(r); pairs += xs.length; }
    }
    return { lag, correlation: mean(rs), hospitals: rs.length, pairs };
  });
  paired.sort((a, b) => a.x - b.x);
  const bins: ExposureBin[] = [];
  const low = paired[0]?.x, high = paired.at(-1)?.x;
  if (paired.length >= 30 && low !== undefined && high !== undefined && high > low) {
    const edges = [0.2, 0.4, 0.6, 0.8].map(q => paired[Math.min(paired.length - 1, Math.max(0, Math.floor(paired.length * q) - 1))]?.x ?? low);
    const own = new Map<string, number[]>();
    for (const item of paired) {
      const group = own.get(item.facility);
      if (group) group.push(item.y); else own.set(item.facility, [item.y]);
    }
    const ownMean = new Map<string, number>();
    for (const [facility, values] of own) {
      const value = mean(values);
      if (value !== null && value > 0) ownMean.set(facility, value);
    }
    const buckets: { x: number; y: number; facility: string }[][] = Array.from({ length: 5 }, () => []);
    for (const item of paired) buckets[edges.filter(edge => item.x > edge).length]?.push(item);
    const ranges = [
      `≤${number(edges[0] ?? 0)}`,
      `${number(edges[0] ?? 0)}–${number(edges[1] ?? 0)}`,
      `${number(edges[1] ?? 0)}–${number(edges[2] ?? 0)}`,
      `${number(edges[2] ?? 0)}–${number(edges[3] ?? 0)}`,
      `>${number(edges[3] ?? 0)}`,
    ];
    for (const [index, slice] of buckets.entries()) {
      if (!slice.length) continue;
      const grouped = new Map<string, number[]>();
      for (const item of slice) {
        const group = grouped.get(item.facility);
        if (group) group.push(item.y); else grouped.set(item.facility, [item.y]);
      }
      const changes: number[] = [];
      for (const [facility, values] of grouped) {
        const baseline = ownMean.get(facility), value = mean(values);
        if (baseline !== undefined && value !== null) changes.push((value / baseline - 1) * 100);
      }
      bins.push({ label: ranges[index] ?? '', change: mean(changes), pairs: slice.length, facilities: changes.length, cases: mean(slice.map(item => item.y)) });
    }
  }
  return { ...healthInsights(selected, indices, key, mode, outcome), dates, daily, exposure, coverageByDay, under5: mean(ages5), over60: mean(ages60),
    average: mean(daily.filter((n): n is number => n !== null)), beds, hospitals: selected.length,
    pairs: paired.length, possiblePairs: indices.length * selected.length,
    unscaled: key ? selected.filter(item => item.unavailable.includes(key)).length : 0,
    lags, bins, burden };
}
