import type { FilterState } from '../../data/types';
import type { AnalysisCache } from '../../data/analysis-cache';
import { filteredAnalysis } from '../../shared/filtered-analysis';
import { mountDriversView } from './view';
import type { DriversData } from './types';

export function mountDrivers(host: HTMLElement, cache: AnalysisCache, initial: FilterState): {update:(filters:FilterState)=>void;destroy:()=>void} {
  const feature = filteredAnalysis<DriversData>(host, cache, results => results.drivers, data => mountDriversView(host,data));
  const update = feature.update;
  update(initial);
  return {update,destroy:feature.destroy};
}
