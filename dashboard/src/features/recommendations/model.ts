import { mean } from '../../shared/admissions/model';
import type { FilterState } from '../../data/types';
import { POLLUTANTS } from './types';
import type { PolicyData, PolicySummary } from './types';

export function summarizePolicy(data: PolicyData, state: FilterState): PolicySummary {
  const selected = data.stations.filter(station => (state.region === 'all' || station.region === state.region) && (state.siteType === 'all' || station.siteType === state.siteType) && (state.station === 'all' || station.code === state.station));
  const key = POLLUTANTS.find(key => key === (state.pollutant ?? 'PM2.5').toLowerCase().replace('.', ''));
  const mode = state.includeSuspect ? 's' : 'v';
  const indices = data.dates.flatMap((date, i) => date >= (state.startDate ?? '') && date <= (state.endDate ?? '9999') ? [i] : []);
  const rows = selected.map(station => {
    const valid = indices.filter(i => key && station.exposure[mode][key][i] !== null && station.exposure[mode][key][i] !== undefined).length;
    const admissions = indices.flatMap(i => { const n = station.admissions[i]; return n === undefined || n === null ? [] : [n]; });
    const average = mean(admissions);
    return { station, valid, meanLoad: average !== null && station.beds !== null && station.beds > 0 ? average / station.beds * 100 : null,
      recorded: indices.reduce((sum, i) => sum + (station.recorded[i] ?? 0), 0), excluded: indices.reduce((sum, i) => sum + (station.excluded[mode][i] ?? 0), 0),
      reason: key && station.unavailable.includes(key) ? 'Satuan logger belum terverifikasi' : valid === 0 ? 'Tidak ada hari paparan tersedia' : null };
  });
  return { rows, indices, dates: indices.flatMap(i => data.dates[i] ?? []), exposureLabel: `${state.pollutant ?? 'PM2.5'} · ${state.includeSuspect ? 'VALID + SUSPECT' : 'VALID'}` };
}
export function distanceKm(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }): number {
  const radians = (n: number): number => n * Math.PI / 180;
  const lat1 = radians(a.latitude), lat2 = radians(b.latitude);
  const chord = Math.sin((lat2 - lat1) / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(radians(b.longitude - a.longitude) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(Math.min(1, Math.max(0, chord))));
}
