import type { Episode, EpisodesSummary, TemporalData } from './types';

export function episodeIndicators(summary: EpisodesSummary): { longestDays: number | null; mostCount: number | null; emptyContext: string } {
  const comparable = summary.comparison_days > 0;
  return {
    longestDays: summary.longest_episode?.duration_days ?? (comparable ? 0 : null),
    mostCount: summary.most_episodes?.count ?? (comparable ? 0 : null),
    emptyContext: comparable ? 'Tidak ada pelampauan pada hari pembanding yang tersedia' : 'Data pembanding belum mencukupi',
  };
}

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

export interface DailyAggregatePoint {
  readonly date: string;
  readonly median: number | null;
  readonly p25: number | null;
  readonly p75: number | null;
  readonly mean: number | null;
  readonly stationCount: number;
}

function quantile(sorted: readonly number[], q: number): number {
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) return sorted[0]!;
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  if (sorted[base + 1] !== undefined) {
    return sorted[base]! + rest * (sorted[base + 1]! - sorted[base]!);
  }
  return sorted[base]!;
}

export function computeDailyStationAggregate(
  dates: readonly string[],
  stations: Record<string, readonly (number | null)[]>
): readonly DailyAggregatePoint[] {
  const stationSeries = Object.values(stations);
  return dates.map((d, dateIndex) => {
    const vals: number[] = [];
    for (const series of stationSeries) {
      const v = series[dateIndex];
      if (v !== null && v !== undefined && !Number.isNaN(v)) {
        vals.push(v);
      }
    }
    if (vals.length === 0) {
      return { date: d, median: null, p25: null, p75: null, mean: null, stationCount: 0 };
    }
    vals.sort((a, b) => a - b);
    const sum = vals.reduce((acc, cur) => acc + cur, 0);
    return {
      date: d,
      median: quantile(vals, 0.5),
      p25: quantile(vals, 0.25),
      p75: quantile(vals, 0.75),
      mean: sum / vals.length,
      stationCount: vals.length,
    };
  });
}

