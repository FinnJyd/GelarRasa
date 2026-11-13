import type { DriversData } from './types';

export interface TrafficPoint {
  station: string;
  traffic: number;
  concentration: number | null;
  siteType: string;
}

export function getTrafficScatterPoints(data: DriversData): readonly TrafficPoint[] {
  return Object.entries(data.traffic_scatter).map(([station, info]) => ({
    station, traffic: info.traffic_intensity_per_h,
    concentration: info.mean_concentration, siteType: info.site_type,
  }));
}
