import type { FilterState, Station } from '../../data/types';
import { filteredAnalysis } from '../../shared/filtered-analysis';
import { mountDriversView } from './view';
import type { DriversData } from './types';

export function mountDrivers(host: HTMLElement, stations: readonly Station[], initial: FilterState): {update:(filters:FilterState)=>void;destroy:()=>void} {
  const feature = filteredAnalysis<DriversData>(host, data => mountDriversView(host,data));
  const update = (filters:FilterState):void => feature.update({feature:'drivers',filters,stations});
  update(initial);
  return {update,destroy:feature.destroy};
}
