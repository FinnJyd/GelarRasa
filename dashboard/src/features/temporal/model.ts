import type { Episode, TemporalData } from './types';

export interface DiurnalPoint {
  hour: number;
  median: number | null;
  p25: number | null;
  p75: number | null;
}

export type DiurnalMode = 'all' | 'haze' | 'nonhaze';

export function getSiteTypes(data: TemporalData): string[] {
  return Object.keys(data.diurnal);
}

export function getAllStationCodes(data: TemporalData): string[] {
  return Object.keys(data.heatmap);
}

export function getDiurnalSeries(
  data: TemporalData,
  siteType: string,
  mode: DiurnalMode,
): DiurnalPoint[] {
  const source =
    mode === 'haze' ? data.diurnal_haze :
    mode === 'nonhaze' ? data.diurnal_nonhaze :
    data.diurnal;
  const hourMap = source[siteType] ?? {};
  return Array.from({ length: 24 }, (_, i) => {
    const stats = hourMap[String(i)];
    if (!stats) return { hour: i, median: null, p25: null, p75: null };
    return { hour: i, median: stats.median, p25: stats.p25, p75: stats.p75 };
  });
}

export function getHeatmapGrid(data: TemporalData, stationCode: string): (number | null)[][] {
  const dowMap = data.heatmap[stationCode] ?? {};
  // 7 rows (Mon=0..Sun=6), 24 columns (hour 0..23)
  return Array.from({ length: 7 }, (_, dow) => {
    const hourMap = dowMap[String(dow)] ?? {};
    return Array.from({ length: 24 }, (_, hour) => {
      const val = hourMap[String(hour)];
      return val === undefined ? null : val;
    });
  });
}

export function getTimeseriesForStation(
  data: TemporalData,
  stationCode: string,
): { dates: readonly string[]; values: readonly (number | null)[] } {
  return {
    dates: data.timeseries.dates,
    values: data.timeseries.stations[stationCode] ?? data.timeseries.dates.map(() => null),
  };
}

export function getEpisodesForStation(data: TemporalData, stationCode: string): readonly Episode[] {
  const list = data.episodes[stationCode] ?? [];
  return [...list].sort((a, b) => b.duration_days - a.duration_days);
}

export interface EpisodeWithStation extends Episode {
  station: string;
}

export function getTopEpisodes(data: TemporalData, limit = 15): readonly EpisodeWithStation[] {
  const all: EpisodeWithStation[] = [];
  for (const [station, list] of Object.entries(data.episodes)) {
    for (const ep of list) {
      all.push({ ...ep, station });
    }
  }
  return all.sort((a, b) => b.duration_days - a.duration_days).slice(0, limit);
}

export function getLongestEpisodePerStation(data: TemporalData): readonly EpisodeWithStation[] {
  const result: EpisodeWithStation[] = [];
  for (const [station, list] of Object.entries(data.episodes)) {
    if (list.length === 0) continue;
    const sorted = [...list].sort((a, b) => b.duration_days - a.duration_days);
    const top = sorted[0];
    if (top) {
      result.push({ ...top, station });
    }
  }
  return result.sort((a, b) => b.duration_days - a.duration_days);
}

export function getHazeHotspotEpisodes(data: TemporalData): readonly EpisodeWithStation[] {
  const hotspotPrefixes = ['KTG', 'JMB', 'PKN', 'PKU', 'STG', 'PLB', 'BTM'];
  const all: EpisodeWithStation[] = [];
  for (const [station, list] of Object.entries(data.episodes)) {
    const isHotspot = hotspotPrefixes.some(pref => station.includes(pref));
    if (!isHotspot) continue;
    for (const ep of list) {
      all.push({ ...ep, station });
    }
  }
  return all.sort((a, b) => b.duration_days - a.duration_days).slice(0, 15);
}
