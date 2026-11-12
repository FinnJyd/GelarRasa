import type {
  CorrelationMatrix,
  CorrelationMode,
  DirectionSector,
  DriversData,
  ExtremeVsNormal,
  TrafficStationData,
  WindBin,
} from './types';

export function getRoseStations(data: DriversData): string[] {
  return Object.keys(data.pollution_rose);
}

export function getRoseData(data: DriversData, stationCode: string): readonly DirectionSector[] {
  return data.pollution_rose[stationCode] ?? [];
}

export function getCorrelationStations(data: DriversData): string[] {
  return Object.keys(data.correlation);
}

export function getCorrelationMatrix(
  data: DriversData,
  stationCode: string,
  mode: CorrelationMode,
): CorrelationMatrix {
  const stationCorr = data.correlation[stationCode];
  if (!stationCorr) return {};
  return stationCorr[mode] ?? {};
}

export function getWindBinSiteTypes(data: DriversData): string[] {
  return Object.keys(data.wind_bins);
}

export function getWindBinsForSiteType(data: DriversData, siteType: string): readonly WindBin[] {
  return data.wind_bins[siteType] ?? [];
}

export interface TrafficPoint {
  station: string;
  traffic: number;
  no2: number | null;
  co: number | null;
  siteType: string;
}

export function getTrafficScatterPoints(data: DriversData): readonly TrafficPoint[] {
  return Object.entries(data.traffic_scatter).map(([station, info]: [string, TrafficStationData]) => ({
    station,
    traffic: info.traffic_intensity_per_h,
    no2: info.mean_no2,
    co: info.mean_co,
    siteType: info.site_type,
  }));
}

export function getExtremeVsNormal(data: DriversData): ExtremeVsNormal {
  return data.extreme_vs_normal;
}

