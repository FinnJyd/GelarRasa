export interface AdmissionBaseline {
  average: number | null; p90: number | null; beds: number | null; facilities: number; days: number;
}
export interface ScenarioInput { baseline: 'mean' | 'p90'; increase: number; extraBeds: number }
export interface Scenario {
  baseline: number; admissions: number; capacity: number; baselineCapacity: number;
  baselineLoad: number; load: number;
}
