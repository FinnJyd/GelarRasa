import type { FilterState } from '../../data/types';
import type { AnalysisCache } from '../../data/analysis-cache';
import { filteredAnalysis } from '../../shared/filtered-analysis';
import { mountTemporalView } from './view';
import type { TemporalData } from './types';

export function mountTemporal(host: HTMLElement, cache: AnalysisCache, initial: FilterState): {update:(filters:FilterState)=>void;destroy:()=>void} {
  const feature = filteredAnalysis<TemporalData>(host, cache, results => results.temporal, data => mountTemporalView(host,data));
  const update = feature.update;
  update(initial);
  return {update,destroy:feature.destroy};
}
