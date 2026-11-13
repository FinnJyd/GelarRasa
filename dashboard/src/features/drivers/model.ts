import type { DriversData } from './types';

export const STATION_ROAD_DISTANCE: Record<string, number> = {
  'AQMS-JKT-01': 45.0, 'AQMS-JKT-02': 25.0, 'AQMS-JKT-03': 6.0,
  'AQMS-KTG-01': 60.0, 'AQMS-KTG-02': 30.0, 'AQMS-BGR-01': 120.0,
  'AQMS-BGR-02': 10.0, 'AQMS-YKY-01': 40.0, 'AQMS-IDP-01': 150.0,
  'AQMS-KTB-01': 200.0, 'AQMS-PKU-01': 35.0, 'AQMS-JMB-01': 40.0,
  'AQMS-BTM-01': 25.0, 'AQMS-BGL-01': 60.0, 'AQMS-SRG-01': 80.0,
  'AQMS-MLG-01': 45.0, 'AQMS-MRS-01': 30.0, 'AQMS-PLU-01': 250.0,
  'AQMS-STG-01': 50.0, 'AQMS-PKN-01': 35.0, 'AQMS-PLB-01': 30.0,
  'AQMS-PSW-01': 35.0, 'AQMS-MER-01': 60.0, 'AQMS-MDN-01': 35.0,
  'AQMS-SM2-01': 40.0, 'AQMS-BJB-01': 45.0, 'AQMS-JMB-02': 65.0,
};

export interface TrafficPoint {
  station: string;
  traffic: number;
  roadDistance: number;
  concentration: number | null;
  siteType: string;
}

export interface TrendStats {
  r: number | null;
  n: number;
  slope: number | null;
  intercept: number | null;
  line: Array<{ x: number; y: number }>;
}

export function computeLinearTrend(points: readonly { x: number; y: number }[]): TrendStats {
  if (points.length < 3) return { r: null, n: points.length, slope: null, intercept: null, line: [] };
  const n = points.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0, sumYY = 0;
  let minX = Infinity, maxX = -Infinity;
  for (const pt of points) {
    sumX += pt.x;
    sumY += pt.y;
    sumXY += pt.x * pt.y;
    sumXX += pt.x * pt.x;
    sumYY += pt.y * pt.y;
    if (pt.x < minX) minX = pt.x;
    if (pt.x > maxX) maxX = pt.x;
  }
  const denomX = n * sumXX - sumX * sumX;
  const denomY = n * sumYY - sumY * sumY;
  if (denomX <= 0 || denomY <= 0) return { r: null, n, slope: null, intercept: null, line: [] };
  const r = (n * sumXY - sumX * sumY) / Math.sqrt(denomX * denomY);
  const slope = (n * sumXY - sumX * sumY) / denomX;
  const intercept = (sumY - slope * sumX) / n;
  return {
    r,
    n,
    slope,
    intercept,
    line: [
      { x: minX, y: slope * minX + intercept },
      { x: maxX, y: slope * maxX + intercept },
    ],
  };
}

export function getTrafficScatterPoints(
  data: DriversData,
  pollutant: 'NO2' | 'CO' | 'PM2.5' = 'NO2',
  nonhazeOnly = false,
): readonly TrafficPoint[] {
  return Object.entries(data.traffic_scatter).map(([station, info]) => {
    let conc: number | null = null;
    if (pollutant === 'NO2') conc = nonhazeOnly ? info.mean_no2_nonhaze : info.mean_no2;
    else if (pollutant === 'CO') conc = nonhazeOnly ? info.mean_co_nonhaze : info.mean_co;
    else conc = nonhazeOnly ? info.mean_pm25_nonhaze : info.mean_pm25;
    if (conc === null && !nonhazeOnly) conc = info.mean_concentration;
    return {
      station,
      traffic: info.traffic_intensity_per_h,
      roadDistance: info.distance_to_road_m,
      concentration: conc,
      siteType: info.site_type,
    };
  });
}
