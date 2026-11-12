import type {
  DiurnalBySiteType, DiurnalStats, Episode, HeatmapData,
  TemporalData, TemporalMeta, TimeseriesData,
  EpisodesSummary, LongestEpisodeSummary, MostEpisodesSummary,
} from './types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requireRecord(value: unknown, label: string): Record<string, unknown> {
  if (!isRecord(value)) throw new Error(`${label}: objeto inválido.`);
  return value as Record<string, unknown>;
}

function requireNumber(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error(`${label}: número inválido.`);
  return value;
}

function requireString(value: unknown, label: string): string {
  if (typeof value !== 'string') throw new Error(`${label}: string inválido.`);
  return value;
}

function requireArray(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value)) throw new Error(`${label}: array inválido.`);
  return value as unknown[];
}

function parseDiurnalStats(value: unknown, label: string): DiurnalStats | null {
  if (value === null || value === undefined) return null;
  const rec = requireRecord(value, label);
  return {
    median: requireNumber(rec['median'], `${label}.median`),
    p25: requireNumber(rec['p25'], `${label}.p25`),
    p75: requireNumber(rec['p75'], `${label}.p75`),
  };
}

function parseDiurnal(value: unknown, label: string): DiurnalBySiteType {
  const outer = requireRecord(value, label);
  const result: DiurnalBySiteType = {};
  for (const [siteType, hourMap] of Object.entries(outer)) {
    const hours = requireRecord(hourMap, `${label}.${siteType}`);
    result[siteType] = {};
    for (const [hour, stats] of Object.entries(hours)) {
      const r = result[siteType];
      if (r !== undefined) r[hour] = parseDiurnalStats(stats, `${label}.${siteType}.${hour}`);
    }
  }
  return result;
}

function parseHeatmap(value: unknown): HeatmapData {
  const outer = requireRecord(value, 'heatmap');
  const result: HeatmapData = {};
  for (const [station, dowMap] of Object.entries(outer)) {
    const dows = requireRecord(dowMap, `heatmap.${station}`);
    result[station] = {};
    for (const [dow, hourMap] of Object.entries(dows)) {
      const hours = requireRecord(hourMap, `heatmap.${station}.${dow}`);
      const stationData = result[station];
      if (stationData !== undefined) {
        stationData[dow] = {};
        for (const [hour, val] of Object.entries(hours)) {
          const dowData = stationData[dow];
          if (dowData !== undefined) {
            if (val === null) { dowData[hour] = null; }
            else { dowData[hour] = requireNumber(val, `heatmap.${station}.${dow}.${hour}`); }
          }
        }
      }
    }
  }
  return result;
}

function parseTimeseries(value: unknown): TimeseriesData {
  const rec = requireRecord(value, 'timeseries');
  const rawDates = requireArray(rec['dates'], 'timeseries.dates');
  const dates = rawDates.map((d, i) => requireString(d, `timeseries.dates[${i}]`));
  const rawStations = requireRecord(rec['stations'], 'timeseries.stations');
  const stations: Record<string, readonly (number | null)[]> = {};
  for (const [code, arr] of Object.entries(rawStations)) {
    const values = requireArray(arr, `timeseries.stations.${code}`);
    stations[code] = values.map((v, i) => {
      if (v === null || v === undefined) return null;
      return requireNumber(v, `timeseries.stations.${code}[${i}]`);
    });
  }
  return { dates, stations };
}

function parseEpisode(value: unknown, label: string): Episode {
  const rec = requireRecord(value, label);
  return {
    start: requireString(rec['start'], `${label}.start`),
    end: requireString(rec['end'], `${label}.end`),
    duration_days: requireNumber(rec['duration_days'], `${label}.duration_days`),
    peak_pm25: requireNumber(rec['peak_pm25'], `${label}.peak_pm25`),
    mean_pm25: requireNumber(rec['mean_pm25'], `${label}.mean_pm25`),
  };
}

function parseEpisodes(value: unknown): Record<string, readonly Episode[]> {
  const outer = requireRecord(value, 'episodes');
  const result: Record<string, readonly Episode[]> = {};
  for (const [station, arr] of Object.entries(outer)) {
    const list = requireArray(arr, `episodes.${station}`);
    result[station] = list.map((item, i) => parseEpisode(item, `episodes.${station}[${i}]`));
  }
  return result;
}

function parseEpisodesSummary(value: unknown): EpisodesSummary {
  const rec = requireRecord(value, 'episodes_summary');
  const longestRaw = requireRecord(rec['longest_episode'], 'episodes_summary.longest_episode');
  const mostRaw = requireRecord(rec['most_episodes'], 'episodes_summary.most_episodes');
  const longest: LongestEpisodeSummary = {
    station: requireString(longestRaw['station'], 'longest_episode.station'),
    start: requireString(longestRaw['start'], 'longest_episode.start'),
    end: requireString(longestRaw['end'], 'longest_episode.end'),
    duration_days: requireNumber(longestRaw['duration_days'], 'longest_episode.duration_days'),
  };
  const most: MostEpisodesSummary = {
    station: requireString(mostRaw['station'], 'most_episodes.station'),
    count: requireNumber(mostRaw['count'], 'most_episodes.count'),
  };
  return { longest_episode: longest, most_episodes: most };
}

function parseMeta(value: unknown): TemporalMeta {
  const rec = requireRecord(value, 'meta');
  if (rec['version'] !== 1) throw new Error(`Versi ekspor temporal tidak didukung: ${String(rec['version'])}.`);
  const dateRange = requireRecord(rec['date_range'], 'meta.date_range');
  const rawHazeMonths = requireArray(rec['haze_months'], 'meta.haze_months');
  return {
    version: 1,
    date_range: {
      start: requireString(dateRange['start'], 'meta.date_range.start'),
      end: requireString(dateRange['end'], 'meta.date_range.end'),
    },
    haze_months: rawHazeMonths.map((m, i) => requireNumber(m, `meta.haze_months[${i}]`)),
    episode_threshold_ug_m3: requireNumber(rec['episode_threshold_ug_m3'], 'meta.episode_threshold_ug_m3'),
    episode_min_valid_hours: requireNumber(rec['episode_min_valid_hours'], 'meta.episode_min_valid_hours'),
    episode_gap_merge_days: requireNumber(rec['episode_gap_merge_days'], 'meta.episode_gap_merge_days'),
  };
}

function parseTemporal(raw: unknown): TemporalData {
  const rec = requireRecord(raw, 'tab3_temporal');
  return {
    meta: parseMeta(rec['meta']),
    diurnal: parseDiurnal(rec['diurnal'], 'diurnal'),
    diurnal_haze: parseDiurnal(rec['diurnal_haze'], 'diurnal_haze'),
    diurnal_nonhaze: parseDiurnal(rec['diurnal_nonhaze'], 'diurnal_nonhaze'),
    heatmap: parseHeatmap(rec['heatmap']),
    timeseries: parseTimeseries(rec['timeseries']),
    episodes: parseEpisodes(rec['episodes']),
    episodes_summary: parseEpisodesSummary(rec['episodes_summary']),
  };
}

let cached: TemporalData | null = null;

export async function loadTemporal(signal: AbortSignal): Promise<TemporalData> {
  if (cached) return cached;
  const request = new AbortController();
  const combined = AbortSignal.any([signal, request.signal]);
  try {
    const response = await fetch('./data/tab3_temporal.json', { signal: combined });
    if (!response.ok) throw new Error(`Ekspor temporal tidak tersedia (${response.status}).`);
    const raw: unknown = await response.json();
    if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
    cached = parseTemporal(raw);
    return cached;
  } finally {
    request.abort();
  }
}
