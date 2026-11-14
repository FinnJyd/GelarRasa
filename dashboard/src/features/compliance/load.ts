import { POLLUTANTS } from '../../data/types';
import type { ComplianceData, ConcentrationSeries } from './types';

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Struktur ekspor kepatuhan tidak valid.');
  return Object.fromEntries(Object.entries(value));
}
export function parseCompliance(value: unknown): ComplianceData {
  const root = record(value);
  if (root['version'] !== 2 || !Array.isArray(root['dates']) || typeof root['method'] !== 'string') throw new Error('Ekspor kepatuhan tidak valid.');
  const dates: string[] = root['dates'].map((day: unknown) => {
    if (typeof day !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(day) || !Number.isFinite(Date.parse(day)) || new Date(day).toISOString().slice(0, 10) !== day) throw new Error('Tanggal tidak valid.');
    return day;
  });
  if (!dates.length || dates.some((day, i) => i > 0 && Date.parse(day) - Date.parse(dates[i - 1] ?? '') !== 86400000)) throw new Error('Kalender tidak berurutan.');
  const series = (raw: unknown): (number | null)[] => {
    if (!Array.isArray(raw) || raw.length !== dates.length) throw new Error('Panjang deret tidak cocok.');
    return raw.map((n: unknown) => {
      if (n === null) return null;
      if (typeof n !== 'number' || !Number.isFinite(n) || n < 0) throw new Error('Konsentrasi tidak valid.');
      return n;
    });
  };
  const concentration = (raw: unknown, eightHour: boolean): ConcentrationSeries => {
    const row = record(raw);
    if (typeof row['reason'] !== 'string') throw new Error('Keterangan satuan tidak valid.');
    const v = series(row['v']);
    const s = series(row['s']);
    const maxima = eightHour ? record(row['max8']) : null;
    if (!eightHour && row['max8'] !== null) throw new Error('Deret delapan jam tidak sesuai polutan.');
    const max8 = maxima ? { v: series(maxima['v']), s: series(maxima['s']) } : null;
    if (row['reason'] && [...v, ...s, ...(max8?.v ?? []), ...(max8?.s ?? [])].some(n => n !== null)) throw new Error('Data dengan satuan tidak tersedia harus kosong.');
    return { reason: row['reason'], v, s, max8 };
  };
  const stations: Record<string, ComplianceData['stations'][string]> = {};
  for (const [code, raw] of Object.entries(record(root['stations']))) {
    const row = record(record(raw)['pollutants']);
    if (Object.keys(row).length !== POLLUTANTS.length) throw new Error('Daftar polutan tidak cocok.');
    stations[code] = { pollutants: {
      'PM2.5': concentration(row['PM2.5'], false), PM10: concentration(row['PM10'], false),
      SO2: concentration(row['SO2'], false), CO: concentration(row['CO'], true),
      O3: concentration(row['O3'], true), NO2: concentration(row['NO2'], false),
    } };
  }
  if (!Object.keys(stations).length) throw new Error('Ekspor tidak memuat stasiun.');
  return { dates, stations, method: root['method'] };
}
let cached: ComplianceData | null = null;
let flight: Promise<ComplianceData> | null = null;
export async function loadCompliance(signal: AbortSignal): Promise<ComplianceData> {
  if (cached) return cached;
  if (flight) return flight;
  flight = (async () => {
    const response = await fetch('./data/compliance_daily.json', { signal });
    if (!response.ok) throw new Error(`Ekspor kepatuhan tidak tersedia (${response.status}).`);
    const parsed = parseCompliance(await response.json());
    cached = parsed;
    return parsed;
  })();
  try { return await flight; } finally { flight = null; }
}
