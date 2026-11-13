import type { PollutantName } from '../../data/types';

export type ThresholdMode = 'global' | 'station';

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
  normalized_ratio: number | null;
  p25: number | null;
  p75: number | null;
  count: number;
}

export interface WindSiteTypeData {
  siteType: string;
  overallMedian: number | null;
  bins: readonly WindBin[];
}

export interface TrafficStationData {
  traffic_intensity_per_h: number;
  distance_to_road_m: number;
  mean_concentration: number | null;
  mean_no2: number | null;
  mean_no2_nonhaze: number | null;
  mean_co: number | null;
  mean_co_nonhaze: number | null;
  mean_pm25: number | null;
  mean_pm25_nonhaze: number | null;
  site_type: string;
}

export interface ExtremeStats {
  median_wind_speed: number | null;
  median_humidity: number | null;
  median_temperature: number | null;
  median_hour: number | null;
  haze_season_share: number | null;
  hour_distribution: readonly number[];
}

export interface ExtremeConditionMetrics {
  median_wind_speed: number | null;
  median_humidity: number | null;
  median_temperature: number | null;
  median_hour: number | null;
  count: number;
}

export interface ExtremeConditionComparison {
  extreme: ExtremeConditionMetrics;
  normal: ExtremeConditionMetrics;
}

export interface ExtremeDiurnalHourly {
  hour: number;
  haze_prob: number | null;
  nonhaze_prob: number | null;
  haze_extreme: number;
  haze_valid: number;
  nonhaze_extreme: number;
  nonhaze_valid: number;
}

export interface ExtremeStatsByThresholdMode {
  threshold: number | null;
  threshold_label: string;
  haze_season_share: number | null;
  conditions: {
    all: ExtremeConditionComparison;
    haze: ExtremeConditionComparison;
    nonhaze: ExtremeConditionComparison;
  };
  diurnal: readonly ExtremeDiurnalHourly[];
  extreme: ExtremeStats;
  normal: ExtremeStats;
}

export interface ExtremeVsNormal {
  threshold: number | null;
  extreme: ExtremeStats;
  normal: ExtremeStats;
}

export interface DriverRankingItem {
  id: string;
  label: string;
  factorType: 'categorical' | 'continuous';
  metricName: 'η²' | 'R²';
  varianceExplained: number;
  r?: number | undefined;
  interpretation: string;
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

export interface StationRoseInfo {
  code: string;
  name: string;
  totalValidHours: number;
  meanConcentration: number | null;
}

export interface DriversData {
  meta: DriversMeta;
  pollution_rose: Record<string, readonly DirectionSector[]>;
  pollution_rose_meta: Record<string, StationRoseInfo>;
  correlation: Record<string, StationCorrelation>;
  wind_bins: Record<string, readonly WindBin[]>;
  wind_by_site_type: Record<string, WindSiteTypeData>;
  traffic_scatter: Record<string, TrafficStationData>;
  extreme_vs_normal: ExtremeVsNormal;
  extreme_modes: {
    global: ExtremeStatsByThresholdMode;
    station: ExtremeStatsByThresholdMode;
  };
  driver_rankings: readonly DriverRankingItem[];
}
