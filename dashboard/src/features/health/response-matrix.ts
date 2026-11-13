import type { FilterState } from '../../data/types';
import type { HealthData } from './types';
import { correlation, mean } from './model';

export function responseMatrix(data: HealthData, codes: readonly string[], state: FilterState): {
  rows: { label: string; young: number | null; older: number | null; hospitals: number; pairs: number; action: string }[];
  peaks: { label: string; lag: number | null; r: number | null }[];
} {
  const selected = codes.flatMap(code => data.stations[code] ? [data.stations[code]] : []), mode = state.includeSuspect ? 's' : 'v';
  const indices = data.dates.flatMap((date, i) => date >= (state.startDate ?? '') && date <= (state.endDate ?? '9999') ? [i] : []);
  const labels = ['≤P25 2024', 'P25–P75 2024', 'P75–P90 2024', '>P90 2024'];
  const actions = ['Pantau kualitas data dan pola kasus.', 'Tinjau kesinambungan layanan dan pemantauan.', 'Tinjau kesiapan layanan pada lokasi dengan kenaikan kasus tercatat.', 'Evaluasi rencana respons bersama catatan kasus dan kondisi alat.'];
  const rows = labels.map((label, band) => {
    const young: number[] = [], older: number[] = []; let pairs = 0;
    for (const station of selected) {
      const x = station.exposure[mode].pm25;
      const reference = station.references[mode].pm25;
      const { p25, p75, p90 } = reference;
      if (reference.count < 30 || p25 === null || p75 === null || p90 === null || p25 >= p75 || p75 >= p90) continue;
      const bucket = indices.filter(i => { const n = x[i]; return n !== null && n !== undefined && (band === 0 ? n <= p25 : band === 1 ? n > p25 && n <= p75 : band === 2 ? n > p75 && n <= p90 : n > p90); });
      const changes = (field: 'resp_admissions_under5' | 'resp_admissions_over60'): number | null => {
        const baselineValues = x.flatMap((n, i) => { const y = station.outcomes[field][i]; return n !== null && n <= p25 && data.dates[i]?.startsWith('2024-') && y !== null && y !== undefined ? [y] : []; });
        const baseline = mean(baselineValues);
        const observed = bucket.flatMap(i => { const y = station.outcomes[field][i]; return y !== null && y !== undefined ? [y] : []; });
        const average = mean(observed); return baselineValues.length >= 10 && baseline !== null && baseline > 0 && average !== null && observed.length >= 10 ? (average / baseline - 1) * 100 : null;
      };
      const a = changes('resp_admissions_under5'), b = changes('resp_admissions_over60');
      if (a !== null && b !== null) { young.push(a); older.push(b); pairs += bucket.length; }
    }
    return { label, young: mean(young), older: mean(older), hospitals: young.length, pairs, action: actions[band] ?? '' };
  });
  const peaks = (['resp_admissions_under5', 'resp_admissions_over60'] as const).map((field, group) => {
    const candidates = Array.from({ length: 8 }, (_, lag) => {
      const values = selected.flatMap(station => {
        const pairs = indices.flatMap(i => { const x = station.exposure[mode].pm25[i - lag], y = station.outcomes[field][i]; return x !== null && x !== undefined && y !== null && y !== undefined ? [{ x, y }] : []; });
        const r = correlation(pairs.map(p => p.x), pairs.map(p => p.y)); return r === null ? [] : [r];
      }); return { lag, r: mean(values) };
    }).filter((value): value is { lag: number; r: number } => value.r !== null).sort((a, b) => b.r - a.r || a.lag - b.lag);
    return { label: group === 0 ? 'Balita' : 'Lansia', lag: candidates[0]?.lag ?? null, r: candidates[0]?.r ?? null };
  });
  return { rows, peaks };
}
