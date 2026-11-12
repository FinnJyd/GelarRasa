export interface DiurnalStats {
  median: number;
  p25: number;
  p75: number;
}

// hour string "0".."23" → stats or null
export type DiurnalHour = Record<string, DiurnalStats | null>;

// site_type → hour → stats
export type DiurnalBySiteType = Record<string, DiurnalHour>;

// station_code → dow "0".."6" → hour "0".."23" → median or null
export type HeatmapData = Record<string, Record<string, Record<string, number | null>>>;

export interface TimeseriesData {
  dates: readonly string[];
  stations: Record<string, readonly (number | null)[]>;
}

export interface Episode {
  start: string;
  end: string;
  duration_days: number;
  peak_pm25: number;
  mean_pm25: number;
}

export interface LongestEpisodeSummary {
  station: string;
  start: string;
  end: string;
  duration_days: number;
}

export interface MostEpisodesSummary {
  station: string;
  count: number;
}

export interface EpisodesSummary {
  longest_episode: LongestEpisodeSummary;
  most_episodes: MostEpisodesSummary;
}

export interface TemporalMeta {
  version: number;
  date_range: { start: string; end: string };
  haze_months: readonly number[];
  episode_threshold_ug_m3: number;
  episode_min_valid_hours: number;
  episode_gap_merge_days: number;
}

export interface TemporalData {
  meta: TemporalMeta;
  diurnal: DiurnalBySiteType;
  diurnal_haze: DiurnalBySiteType;
  diurnal_nonhaze: DiurnalBySiteType;
  heatmap: HeatmapData;
  timeseries: TimeseriesData;
  episodes: Record<string, readonly Episode[]>;
  episodes_summary: EpisodesSummary;
}
