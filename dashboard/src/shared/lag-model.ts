export interface Fit {
  coefficients: readonly number[]; covariance: readonly (readonly number[])[];
  references: Readonly<Record<string, { features: readonly number[]; beds: number; range: readonly [number, number] }>>;
  trainRows: number; testRows: number; supportedTestRows: number; excludedTestRows: number;
  test: { mae: number; rmse: number }; baseline: { mae: number; rmse: number }; supportedTest: { mae: number; rmse: number };
}
export interface LagMode { features: readonly string[]; outcomes: { young: Fit; older: Fit } }
export interface LagData { models: { v: LagMode; s: LagMode } }
export function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Struktur hasil analisis tidak valid.');
  return Object.fromEntries(Object.entries(value));
}
export function finite(value: unknown, min = -Number.MAX_VALUE): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min) throw new Error('Angka hasil analisis tidak valid.'); return value;
}
export function list(value: unknown): unknown[] { if (!Array.isArray(value)) throw new Error('Deret hasil analisis tidak valid.'); return value; }
export function parseLagData(value: unknown): LagData {
  const raw = record(value); if (raw['version'] !== 1) throw new Error('Versi model tidak didukung.');
  if (JSON.stringify(raw['train']) !== '["2024-01-01","2025-12-31"]' || JSON.stringify(raw['test']) !== '["2026-01-01","2026-10-14"]') throw new Error('Pemisahan waktu model tidak sesuai.');
  const modes = record(raw['models']);
  function mode(value: unknown): LagMode {
    const row = record(value), features = list(row['features']).map(value => { if (typeof value !== 'string') throw new Error('Fitur model tidak valid.'); return value; });
    if (features.length < 10 || features.length > 100 || features[0] !== 'intercept' || features.slice(1, 9).some((name, i) => name !== `pm25_lag${i}_per10`)) throw new Error('Urutan fitur model tidak sesuai.');
    function fit(value: unknown): Fit {
      const row = record(value), coefficients = list(row['coefficients']).map(value => finite(value));
      const covariance = list(row['covariance']).map(value => list(value).map(value => finite(value)));
      if (row['converged'] !== true || coefficients.length !== features.length || covariance.length !== features.length || covariance.some((values, i) => values.length !== features.length || values.some((n, j) => Math.abs(n - (covariance[j]?.[i] ?? Infinity)) > 1e-7))) throw new Error('Koefisien atau kovarians model tidak sesuai.');
      const references = Object.fromEntries(Object.entries(record(row['references'])).map(([code, value]) => {
        const item = record(value), vector = list(item['features']).map(value => finite(value)), range = list(item['range']).map(value => finite(value, 0));
        const low = range[0], high = range[1];
        if (!/^AQMS-[A-Z0-9]+-\d{2}$/.test(code) || vector.length !== coefficients.length || vector[0] !== 1 || range.length !== 2 || low === undefined || high === undefined || high <= low) throw new Error('Profil referensi model tidak valid.');
        const bounds: readonly [number, number] = [low, high];
        const beds = finite(item['beds'], 0); if (!beds) throw new Error('Kapasitas model tidak tersedia.');
        return [code, { features: vector, beds, range: bounds }];
      }));
      const metrics = (value: unknown): { mae: number; rmse: number } => { const m = record(value); return { mae: finite(m['mae'], 0), rmse: finite(m['rmse'], 0) }; };
      const count = (key: string): number => { const n = finite(row[key], 0); if (!Number.isSafeInteger(n)) throw new Error('Jumlah sampel model tidak valid.'); return n; };
      const trainRows = count('trainRows'), testRows = count('testRows'), supportedTestRows = count('supportedTestRows'), excludedTestRows = count('excludedTestRows');
      if (!Object.keys(references).length || !trainRows || !testRows || supportedTestRows + excludedTestRows !== testRows) throw new Error('Cakupan model tidak valid.');
      return { coefficients, covariance, references, trainRows, testRows, supportedTestRows, excludedTestRows, test: metrics(row['test']), baseline: metrics(row['baseline']), supportedTest: metrics(row['supportedTest']) };
    }
    const outcomes = record(row['outcomes']); return { features, outcomes: { young: fit(outcomes['young']), older: fit(outcomes['older']) } };
  }
  return { models: { v: mode(modes['v']), s: mode(modes['s']) } };
}
export function scenarioDomain(mode: LagMode, codes: readonly string[]): { codes: string[]; reference: number; min: number; max: number; beds: number } | null {
  const selected = codes.filter(code => mode.outcomes.young.references[code] && mode.outcomes.older.references[code]);
  const refs = selected.flatMap(code => { const r = mode.outcomes.young.references[code]; return r ? [r] : []; });
  if (!refs.length) return null;
  const reference = refs.reduce((sum, r) => sum + r.features.slice(1, 9).reduce((a, b) => a + b * 10, 0) / 8, 0) / refs.length;
  const minDelta = Math.max(...refs.flatMap(r => r.features.slice(1, 9).map(n => r.range[0] - n * 10)));
  const maxDelta = Math.min(...refs.flatMap(r => r.features.slice(1, 9).map(n => r.range[1] - n * 10)));
  return minDelta <= 0 && maxDelta >= 0 ? { codes: selected, reference, min: reference + minDelta, max: reference + maxDelta, beds: refs.reduce((sum, r) => sum + r.beds, 0) } : null;
}
export function expectedAdmissions(fit: Fit, codes: readonly string[], delta: number): { mean: number; lower: number; upper: number } | null {
  const gradient = Array.from({ length: fit.coefficients.length }, () => 0); let mean = 0;
  if (!codes.length || !Number.isFinite(delta)) return null;
  for (const code of codes) {
    const ref = fit.references[code]; if (!ref) return null;
    const x = ref.features.map((n, i) => i >= 1 && i <= 8 ? n + delta / 10 : n);
    if (x.slice(1, 9).some(n => n * 10 < ref.range[0] - 1e-8 || n * 10 > ref.range[1] + 1e-8)) return null;
    const mu = Math.exp(x.reduce((sum, n, i) => sum + n * (fit.coefficients[i] ?? 0), 0));
    if (!Number.isFinite(mu)) return null;
    mean += mu; x.forEach((n, i) => { gradient[i] = (gradient[i] ?? 0) + mu * n; });
  }
  const variance = gradient.reduce((sum, a, i) => sum + gradient.reduce((inner, b, j) => inner + a * b * (fit.covariance[i]?.[j] ?? 0), 0), 0);
  if (variance < -1e-8 || mean <= 0) return null;
  const error = 1.96 * Math.sqrt(Math.max(0, variance)) / mean;
  const lower = mean * Math.exp(-error), upper = mean * Math.exp(error);
  return Number.isFinite(lower) && Number.isFinite(upper) ? { mean, lower, upper } : null;
}
let cache: LagData | null = null;
export async function loadLagData(signal: AbortSignal): Promise<LagData> {
  if (cache) return cache;
  const response = await fetch('./data/model_coef.json', { signal });
  if (!response.ok) throw new Error('Ekspor model tidak tersedia.');
  const result = parseLagData(await response.json()); if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
  cache = result; return result;
}
