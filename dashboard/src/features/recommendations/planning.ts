import { mean, quantile } from '../../shared/admissions';
import type { AdmissionBaseline } from '../../shared/admissions';
import type { PolicySummary } from './types';

export function admissionBaseline(summary: PolicySummary): AdmissionBaseline {
  const facilities = summary.rows.map(row => row.station);
  const daily = summary.indices.flatMap(i => {
    if (!facilities.length) return [];
    const values = facilities.map(facility => facility.admissions[i]);
    return values.every((n): n is number => n !== null && n !== undefined) ? [values.reduce((a, b) => a + b, 0)] : [];
  });
  const capacities = facilities.map(facility => facility.beds);
  return { average: mean(daily), p90: quantile(daily, .9), days: daily.length, facilities: facilities.length,
    beds: capacities.length && capacities.every((n): n is number => n !== null && Number.isFinite(n) && n > 0) ? capacities.reduce((a, b) => a + b, 0) : null };
}
