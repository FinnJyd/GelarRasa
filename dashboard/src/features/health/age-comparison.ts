import type { FilterState, Station } from '../../data/types';
import { mean, pollutantKey } from './model';
import type { HealthData } from './types';

export interface AgePoint { label: string; under5: number; over60: number; exposure: number; days: number }
export interface AgeComparison {
  points: AgePoint[]; facilities: number; selectedFacilities: number; baselineDays: number;
  baselineUnder5: number | null; baselineOver60: number | null;
}
interface Pair { exposure: number; under5: number; over60: number }
interface FacilityComparison { points: AgePoint[]; baselineDays: number; under5: number; over60: number }

export function compareAgeGroups(data: HealthData, catalog: readonly Station[], filters: FilterState): AgeComparison {
  const pollutant = pollutantKey(filters.pollutant);
  const mode = filters.includeSuspect ? 's' : 'v';
  const indices = data.dates.flatMap((day, index) => day >= (filters.startDate ?? data.dates[0] ?? '')
    && day <= (filters.endDate ?? data.dates.at(-1) ?? '') ? [index] : []);
  const selected = catalog.filter(station => (filters.region === 'all' || station.region === filters.region)
    && (filters.siteType === 'all' || station.siteType === filters.siteType)
    && (filters.station === 'all' || station.code === filters.station))
    .flatMap(station => { const item = data.stations[station.code]; return item ? [item] : []; });
  const facilities: FacilityComparison[] = [];
  for (const station of selected) {
    const young: number[] = [], old: number[] = [], pairs: Pair[] = [];
    for (const index of indices) {
      const under5 = station.outcomes.resp_admissions_under5[index];
      const over60 = station.outcomes.resp_admissions_over60[index];
      if (under5 === undefined || under5 === null || over60 === undefined || over60 === null) continue;
      young.push(under5); old.push(over60);
      const exposure = pollutant ? station.exposure[mode][pollutant][index] : null;
      if (exposure !== undefined && exposure !== null) pairs.push({ exposure, under5, over60 });
    }
    const under5 = mean(young), over60 = mean(old);
    if (under5 === null || over60 === null || under5 <= 0 || over60 <= 0 || pairs.length < 30) continue;
    pairs.sort((a, b) => a.exposure - b.exposure);
    const cutoffs = [1, 2, 3, 4].flatMap(part => {
      const pair = pairs[Math.ceil(pairs.length * part / 5) - 1];
      return pair ? [pair.exposure] : [];
    });
    const bins: Pair[][] = Array.from({ length: 5 }, () => []);
    for (const pair of pairs) {
      const index = cutoffs.findIndex(cutoff => pair.exposure <= cutoff);
      bins[index === -1 ? 4 : index]?.push(pair);
    }
    // Keep the same facilities in every group and never split equal concentrations by row order.
    if (bins.some(bin => !bin.length)) continue;
    facilities.push({ baselineDays: young.length, under5, over60,
      points: bins.map((bin, index) => ({ label: `P${index + 1}`,
        under5: (bin.reduce((sum, pair) => sum + pair.under5, 0) / bin.length / under5 - 1) * 100,
        over60: (bin.reduce((sum, pair) => sum + pair.over60, 0) / bin.length / over60 - 1) * 100,
        exposure: bin.reduce((sum, pair) => sum + pair.exposure, 0) / bin.length, days: bin.length,
      })),
    });
  }
  return {
    facilities: facilities.length, selectedFacilities: selected.length,
    baselineDays: facilities.reduce((sum, item) => sum + item.baselineDays, 0),
    baselineUnder5: mean(facilities.map(item => item.under5)), baselineOver60: mean(facilities.map(item => item.over60)),
    points: facilities.length ? Array.from({ length: 5 }, (_, index) => {
      const points = facilities.flatMap(item => { const point = item.points[index]; return point ? [point] : []; });
      return { label: `P${index + 1}`, under5: points.reduce((sum, point) => sum + point.under5, 0) / points.length,
        over60: points.reduce((sum, point) => sum + point.over60, 0) / points.length,
        exposure: points.reduce((sum, point) => sum + point.exposure * point.days, 0) / points.reduce((sum, point) => sum + point.days, 0),
        days: points.reduce((sum, point) => sum + point.days, 0) };
    }) : [],
  };
}
