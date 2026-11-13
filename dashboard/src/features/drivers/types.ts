import type { PollutantName } from '../../data/types';

export interface DirectionSector {
  direction_label: string;
  mean_concentration: number | null;
  count: number;
}

export interface CorrelationRow {
  temperature_c: number | null;
  humidity_pct: number | null;
  wind_speed_ms: number | null;
}

export type CorrelationMatrix = Record<string, CorrelationRow>;

export type CorrelationMode = 'all' | 'haze' | 'nonhaze';

export type StationCorrelation = Record<CorrelationMode, CorrelationMatrix>;

export interface WindBin {
  label: string;
  median_concentration: number | null;
  p25: number | null;
  p75: number | null;
  count: number;
}

export interface TrafficStationData {
  traffic_intensity_per_h: number;
  mean_concentration: number | null;
  site_type: string;
}

export interface ExtremeStats {
  median_wind_speed: number | null;
  median_humidity: number | null;
  median_temperature: number | null;
  haze_season_share: number | null;
  hour_distribution: readonly number[];
}

export interface ExtremeVsNormal {
  threshold: number | null;
  extreme: ExtremeStats;
  normal: ExtremeStats;
}

export interface DriversMeta {
  pollutant: PollutantName;
  version: number;
  date_range: { start: string; end: string };
  haze_months: readonly number[];
  calm_wind_threshold_ms: number;
  correlation_min_obs: number;
  extreme_percentile: number;
}

export interface DriversData {
  meta: DriversMeta;
  pollution_rose: Record<string, readonly DirectionSector[]>;
  correlation: Record<string, StationCorrelation>;
  wind_bins: Record<string, readonly WindBin[]>;
  traffic_scatter: Record<string, TrafficStationData>;
  extreme_vs_normal: ExtremeVsNormal;
}
