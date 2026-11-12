import type { PollutantName, Station } from '../../data/types';

export interface ConcentrationSeries {
  reason: string;
  v: readonly (number | null)[];
  s: readonly (number | null)[];
  max8: { v: readonly (number | null)[]; s: readonly (number | null)[] } | null;
}

export interface ComplianceData {
  dates: readonly string[];
  stations: Readonly<Record<string, { pollutants: Record<PollutantName, ConcentrationSeries> }>>;
  method: string;
}
export interface ComplianceRow {
  station: Station;
  mean: number | null;
  days: number;
  exceed: number;
  comparisonDays: number;
  categories: readonly number[];
  reason: string;
}
export interface YearComparison { year: number; days: number; exceed: number; rate: number | null }
export type ChangePattern = 'Membaik konsisten' | 'Memburuk konsisten' | 'Tetap' | 'Berfluktuasi' | 'Data tidak lengkap';
export interface StationComparison {
  station: Station;
  years: readonly YearComparison[];
  change2425: number | null;
  change2526: number | null;
  change2426: number | null;
  pattern: ChangePattern;
}
export interface IkuRow { station: Station; score: number | null; no2: number | null; so2: number | null; days: number }
