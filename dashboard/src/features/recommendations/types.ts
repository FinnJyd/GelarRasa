export const POLLUTANTS = ['pm25', 'pm10', 'so2', 'co', 'o3', 'no2'] as const;
export type Pollutant = typeof POLLUTANTS[number];
export type Mode = 'v' | 's';
export type Series = readonly (number | null)[];
export type Status = 'Active' | 'Intermittent' | 'Defective';
export interface PolicyStation {
  code: string; name: string; city: string; province: string; region: string; siteType: string;
  latitude: number; longitude: number; status: Status; hospital: string; beds: number | null;
  admissions: Series; recorded: readonly number[]; excluded: Record<Mode, readonly number[]>;
  exposure: Record<Mode, Record<Pollutant, Series>>;
  unavailable: readonly string[]; nearest: { code: string; km: number };
}
export interface PolicyData { dates: readonly string[]; stations: readonly PolicyStation[] }
export interface StationEvidence {
  station: PolicyStation; meanLoad: number | null; valid: number; recorded: number; excluded: number; reason: string | null;
}
export interface PolicySummary { rows: StationEvidence[]; dates: readonly string[]; indices: readonly number[]; exposureLabel: string }
export interface PolicyAction {
  id: string; title: string; locations: string; evidence: string; step: string; followUp: string;
}
