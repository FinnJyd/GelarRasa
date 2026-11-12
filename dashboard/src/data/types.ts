import type { RouteId } from '../shared/routes';

export const CATEGORIES = ['Baik', 'Sedang', 'Tidak Sehat', 'Sangat Tidak Sehat', 'Berbahaya'] as const;
export type Category = typeof CATEGORIES[number];

export const POLLUTANTS = ['PM2.5', 'PM10', 'SO2', 'CO', 'O3', 'NO2'] as const;
export type PollutantName = typeof POLLUTANTS[number];

export interface ThresholdInfo {
  label: string;
  unit: string;
  pp22_24h: number;
  pp22_annual: number;
  ispu_bins: readonly number[];
  ispu_categories: readonly Category[];
}

export interface StationHospitalHealth {
  readonly hospital_id: string;
  readonly hospital_name: string;
  readonly beds: number;
  readonly admissions: readonly number[];
}

export interface DailyCube {
  dates: readonly string[];
  pollutants: readonly string[];
  thresholds: Record<string, ThresholdInfo>;
  stations: Record<string, {
    unavailable: readonly string[];
    v: Record<string, readonly (number | null)[]>;
    s: Record<string, readonly (number | null)[]>;
  }>;
  health_daily: {
    total_bed_capacity: number;
    total_hospitals: number;
    admissions_by_date: readonly number[];
    by_station?: Record<string, StationHospitalHealth>;
  };
}

export interface Station {
  code: string;
  name: string;
  city: string;
  province: string;
  region: string;
  siteType: string;
  notes: string;
  latitude: number;
  longitude: number;
  average: number;
  exceedance: number;
  validPercentage: number;
  category: Category;
}

export interface StationObservation extends Omit<Station, 'average' | 'exceedance' | 'category'> {
  average: number | null;
  exceedance: number | null;
  category: Category | null;
  measuredDays: number;
  periodDays: number;
  unavailableReason: string | null;
}

export interface MeasuredStationObservation extends StationObservation {
  average: number;
  exceedance: number;
  category: Category;
}

export interface DashboardData {
  start: string;
  end: string;
  generated: string;
  nationalExceedance: number;
  reference: { daily: number; annual: number; whoAnnual: number };
  stations: readonly Station[];
  hospital: {
    burden: number;
    dailyAdmissions: number;
    beds: number;
    hospitals: number;
    days: number;
    hospitalName?: string | undefined;
    hospitalCount?: number;
  };
  cube?: DailyCube;
}

export interface FilterState {
  region: string;
  siteType: string;
  station: string;
  periodPreset?: string;
  startDate?: string;
  endDate?: string;
  pollutant?: string;
  includeSuspect?: boolean;
}

export interface Feature {
  id: RouteId;
  title: string;
  question: string;
  icon: string;
  mount: (host: HTMLElement) => () => void;
}
