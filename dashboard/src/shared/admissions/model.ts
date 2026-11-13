import type { AdmissionBaseline, Scenario, ScenarioInput } from './types';

export function quantile(values: readonly number[], probability: number): number | null {
  if (!values.length || probability < 0 || probability > 1 || !Number.isFinite(probability)) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const position = (sorted.length - 1) * probability;
  const low = sorted[Math.floor(position)], high = sorted[Math.ceil(position)];
  return low === undefined || high === undefined ? null : low + (high - low) * (position - Math.floor(position));
}
export const mean = (values: readonly number[]): number | null => values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
export function simulate(summary: Pick<AdmissionBaseline, 'average' | 'p90' | 'beds'>, input: ScenarioInput): Scenario | null {
  const baseline = input.baseline === 'mean' ? summary.average : summary.p90;
  if (baseline === null || !Number.isFinite(baseline) || baseline < 0 || summary.beds === null || summary.beds <= 0 || !Number.isFinite(summary.beds)
    || !Number.isFinite(input.increase) || input.increase < 0 || input.increase > 200
    || !Number.isSafeInteger(input.extraBeds) || input.extraBeds < 0 || input.extraBeds > 100000) return null;
  const capacity = summary.beds + input.extraBeds;
  const admissions = baseline * (1 + input.increase / 100);
  return { baseline, admissions, capacity, baselineCapacity: summary.beds,
    baselineLoad: baseline / summary.beds * 100, load: admissions / capacity * 100 };
}

