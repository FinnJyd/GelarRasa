import type { RouteId } from '../shared/routes';

export const CATEGORIES = ['Baik', 'Sedang', 'Tidak Sehat', 'Sangat Tidak Sehat', 'Berbahaya'] as const;
export type Category = typeof CATEGORIES[number];

export interface Station {
  code: string;
  name: string;
  city: string;
  province: string;
  region: string;
  siteType: string;
  latitude: number;
  longitude: number;
  average: number;
  exceedance: number;
  validPercentage: number;
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
  };
}

export interface FilterState {
  region: string;
  siteType: string;
  station: string;
}

export interface Feature {
  id: RouteId;
  title: string;
  question: string;
  icon: string;
  mount: (host: HTMLElement) => () => void;
}
