export function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Struktur hasil analisis tidak valid.');
  return Object.fromEntries(Object.entries(value));
}
export function finite(value: unknown, min = -Number.MAX_VALUE): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min) throw new Error('Angka hasil analisis tidak valid.'); return value;
}
export function list(value: unknown): unknown[] { if (!Array.isArray(value)) throw new Error('Deret hasil analisis tidak valid.'); return value; }