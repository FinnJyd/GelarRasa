import type { AgeContrast, EpisodeSummary } from './insights';
export const OUTCOMES = {
  resp: 'Admisi pernapasan umum',
  resp_admissions_under5: 'Admisi pernapasan · balita <5 tahun',
  resp_admissions_over60: 'Admisi pernapasan · lansia >60 tahun',
  asthma_emergency_cases: 'Kasus darurat asma',
  copd_admissions: 'Admisi PPOK',
  cvd: 'Admisi kardiovaskular',
  death: 'Kematian',
} as const;
export type Outcome = keyof typeof OUTCOMES;
export const POLLUTANT_KEYS = ['pm25', 'pm10', 'so2', 'co', 'o3', 'no2'] as const;
export type PollutantKey = typeof POLLUTANT_KEYS[number];
export type Series = readonly (number | null)[];
export interface Reference { count: number; p25: number | null; p75: number | null; p90: number | null }
export interface HealthStation {
  references: { v: Record<PollutantKey, Reference>; s: Record<PollutantKey, Reference> };
  hospital: string;
  beds: number;
  outcomes: Record<Outcome, Series>;
  exposure: { v: Record<PollutantKey, Series>; s: Record<PollutantKey, Series> };
  unavailable: readonly string[];
}
export interface HealthData {
  dates: readonly string[];
  stations: Readonly<Record<string, HealthStation>>;
  discrepancies: number;
}
export interface LagPoint { lag: number; correlation: number | null; hospitals: number; pairs: number }
export interface ExposureBin { label: string; mean: number; admissions: number; pairs: number }
export interface HealthSummary {
  ages: AgeContrast[]; episodes: EpisodeSummary; strain: Series; strainPeak: number | null;
  dates: string[];
  daily: (number | null)[];
  exposure: (number | null)[];
  coverageByDay: number[];
  under5: number | null;
  over60: number | null;
  average: number | null;
  beds: number;
  hospitals: number;
  pairs: number;
  possiblePairs: number;
  unscaled: number;
  lags: LagPoint[];
  bins: ExposureBin[];
  burden: (number | null)[];
}
