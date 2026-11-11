import { CATEGORIES } from '../../data/types';
import type { Category, FilterState, Station } from '../../data/types';

export const defaultFilters = (): FilterState => ({ region: 'all', siteType: 'all', station: 'all' });

export function filterStations(stations: readonly Station[], state: FilterState): Station[] {
  return stations.filter(station =>
    (state.region === 'all' || station.region === state.region) &&
    (state.siteType === 'all' || station.siteType === state.siteType) &&
    (state.station === 'all' || station.code === state.station),
  ).sort((a, b) => b.average - a.average || a.code.localeCompare(b.code));
}

export function summarize(stations: readonly Station[]): {
  mean: number | null;
  validMean: number | null;
  highest: Station | null;
  distribution: { category: Category; count: number }[];
} {
  return {
    mean: stations.length ? stations.reduce((sum, station) => sum + station.average, 0) / stations.length : null,
    validMean: stations.length ? stations.reduce((sum, station) => sum + station.validPercentage, 0) / stations.length : null,
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
