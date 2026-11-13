import type { FilterState, Station } from '../../data/types';
import { filteredAnalysis } from '../../shared/filtered-analysis';
import { mountTemporalView } from './view';
import type { TemporalData } from './types';

export function mountTemporal(host: HTMLElement, stations: readonly Station[], initial: FilterState): {update:(filters:FilterState)=>void;destroy:()=>void} {
  const feature = filteredAnalysis<TemporalData>(host, data => mountTemporalView(host,data));
  const update = (filters:FilterState):void => feature.update({feature:'temporal',filters,stations});
  update(initial);
  return {update,destroy:feature.destroy};
}
