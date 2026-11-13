import type { HealthStation, Series } from './types';
import type { PollutantKey } from './types';

const average = (values: readonly number[]): number | null => values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
export interface EpisodeSummary { changes: Series; admissions: Series; events: number; hospitals: number }
export function healthInsights(selected: readonly HealthStation[], indices: readonly number[], key: PollutantKey | null, mode: 'v' | 's', outcome: keyof HealthStation['outcomes']): {
  episodes: EpisodeSummary; strain: Series; strainPeak: number | null;
} {
  const trajectories: number[][] = [], observedTrajectories: number[][] = []; let hospitals = 0;
  const allowed = new Set(indices);
  for (const station of selected) {
    const exposure = key ? station.exposure[mode][key] : [];
    const reference = key ? station.references[mode][key] : null;
    if (!reference || reference.count < 30) continue;
    const threshold = reference.p90; if (threshold === null) continue;
    let last = -100, accepted = 0;
    for (const i of indices) {
      const n = exposure[i], previous = exposure[i - 1];
      if (n === null || n === undefined || previous === null || previous === undefined || n <= threshold || previous > threshold || i - last < 11) continue;
      const window = Array.from({ length: 11 }, (_, offset) => i + offset - 3);
      if (!window.every(j => allowed.has(j) && exposure[j] !== null && exposure[j] !== undefined && station.outcomes[outcome][j] !== null && station.outcomes[outcome][j] !== undefined)) continue;
      const values = window.map(j => station.outcomes[outcome][j]).filter((y): y is number => y !== null && y !== undefined);
      const baseline = average(values.slice(0, 3));
      if (baseline === null || baseline <= 0) continue;
      trajectories.push(values.map(y => (y / baseline - 1) * 100)); observedTrajectories.push(values); last = i; accepted++;
    }
    if (accepted) hospitals++;
  }
  const strain = indices.map(i => {
    if (!selected.length || selected.some(station => station.beds <= 0)) return null;
    const combined = selected.map(station => {
      const resp = station.outcomes.resp[i], cvd = station.outcomes.cvd[i];
      return resp === undefined || resp === null || cvd === undefined || cvd === null ? null : resp + cvd;
    });
    return combined.every((n): n is number => n !== null) ? combined.reduce((a, b) => a + b, 0) / selected.reduce((sum, station) => sum + station.beds, 0) * 100 : null;
  });
  const observed = strain.filter((n): n is number => n !== null);
  return { episodes: { admissions: Array.from({ length: 11 }, (_, i) => trajectories.length >= 3 ? average(observedTrajectories.flatMap(row => row[i] === undefined ? [] : [row[i]])) : null), changes: Array.from({ length: 11 }, (_, i) => trajectories.length >= 3 ? average(trajectories.flatMap(row => row[i] === undefined ? [] : [row[i]])) : null), events: trajectories.length, hospitals },
    strain, strainPeak: observed.length ? Math.max(...observed) : null };
}
