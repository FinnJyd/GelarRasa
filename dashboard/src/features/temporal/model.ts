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

export function getTopEpisodes(data: TemporalData, limit = 10): readonly EpisodeWithStation[] {
  return Object.entries(data.episodes).flatMap(([station, episodes]) => episodes.map(episode => ({ station, ...episode })))
    .sort((a, b) => b.duration_days - a.duration_days).slice(0, limit);
}

export function getLongestEpisodePerStation(data: TemporalData, limit = 10): readonly EpisodeWithStation[] {
  return Object.entries(data.episodes).flatMap(([station, episodes]) => {
    const longest = [...episodes].sort((a, b) => b.duration_days - a.duration_days)[0];
    return longest ? [{ station, ...longest }] : [];
  }).sort((a, b) => b.duration_days - a.duration_days).slice(0, limit);
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

export interface MonthSummary {
  readonly monthIndex: number;
  readonly monthLabel: string;
  readonly y2024: number | null;
  readonly y2025: number | null;
  readonly y2026: number | null;
  readonly combinedMedian: number | null;
  readonly combinedP25: number | null;
  readonly combinedP75: number | null;
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'] as const;

export function getMonthlySeasonality(data: TemporalData): readonly MonthSummary[] {
  const daily = computeDailyStationAggregate(data.timeseries.dates, data.timeseries.stations);
  const buckets: { '2024': number[]; '2025': number[]; '2026': number[]; all: number[] }[] = Array.from(
    { length: 12 },
    () => ({ '2024': [], '2025': [], '2026': [], all: [] })
  );

  for (const pt of daily) {
    if (pt.median === null) continue;
    const year = pt.date.slice(0, 4);
    const m = parseInt(pt.date.slice(5, 7), 10) - 1;
    if (m >= 0 && m < 12) {
      const b = buckets[m];
      if (b) {
        b.all.push(pt.median);
        if (year === '2024') b['2024'].push(pt.median);
        else if (year === '2025') b['2025'].push(pt.median);
        else if (year === '2026') b['2026'].push(pt.median);
      }
    }
  }

  const medianOf = (arr: number[]): number | null => {
    if (arr.length === 0) return null;
    arr.sort((a, b) => a - b);
    return Math.round(quantile(arr, 0.5) * 10) / 10;
  };

  return MONTH_NAMES.map((name, m) => {
    const b = buckets[m]!;
    b.all.sort((a, b) => a - b);
    const combinedMedian = b.all.length ? Math.round(quantile(b.all, 0.5) * 10) / 10 : null;
    const combinedP25 = b.all.length ? Math.round(quantile(b.all, 0.25) * 10) / 10 : null;
    const combinedP75 = b.all.length ? Math.round(quantile(b.all, 0.75) * 10) / 10 : null;

    return {
      monthIndex: m,
      monthLabel: name,
      y2024: medianOf(b['2024']),
      y2025: medianOf(b['2025']),
      y2026: medianOf(b['2026']),
      combinedMedian,
      combinedP25,
      combinedP75,
    };
  });
}

export interface EpisodeScatterPoint {
  readonly x: number;
  readonly y: number;
  readonly station: string;
  readonly start: string;
  readonly end: string;
  readonly mean: number;
}

export function getEpisodeScatterPoints(data: TemporalData): readonly EpisodeScatterPoint[] {
  return Object.entries(data.episodes)
    .flatMap(([station, episodes]) =>
      episodes.map(ep => ({
        x: ep.duration_days,
        y: Math.round(ep.peak_concentration * 10) / 10,
        station,
        start: ep.start,
        end: ep.end,
        mean: Math.round(ep.mean_concentration * 10) / 10,
      }))
    )
    .sort((a, b) => a.x - b.x);
}

