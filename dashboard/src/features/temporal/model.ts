import type { Episode, TemporalData } from './types';

export interface DiurnalPoint { hour: number; median: number | null; p25: number | null; p75: number | null }
export interface EpisodeWithStation extends Episode { station: string }

export function getDiurnalSeries(data: TemporalData, group: string, mode: 'all' | 'haze' | 'nonhaze'): DiurnalPoint[] {
  const source = mode === 'haze' ? data.diurnal_haze : mode === 'nonhaze' ? data.diurnal_nonhaze : data.diurnal;
  return Array.from({ length: 24 }, (_, hour) => {
    const stats = source[group]?.[String(hour)];
    return { hour, median: stats?.median ?? null, p25: stats?.p25 ?? null, p75: stats?.p75 ?? null };
  });
}

export function getTopEpisodes(data: TemporalData, limit = 15): readonly EpisodeWithStation[] {
  return Object.entries(data.episodes).flatMap(([station, episodes]) => episodes.map(episode => ({ station, ...episode })))
    .sort((a, b) => b.duration_days - a.duration_days).slice(0, limit);
}

export function getLongestEpisodePerStation(data: TemporalData): readonly EpisodeWithStation[] {
  return Object.entries(data.episodes).flatMap(([station, episodes]) => {
    const longest = [...episodes].sort((a, b) => b.duration_days - a.duration_days)[0];
    return longest ? [{ station, ...longest }] : [];
  }).sort((a, b) => b.duration_days - a.duration_days);
}
