import { POLLUTANTS } from './types';
import type { Mode, PolicyData, PolicyStation, Pollutant, Series, Status } from './types';
import { distanceKm } from './model';
import { json as cachedJson } from '../../data/load';

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Struktur ekspor kebijakan tidak valid.');
  return Object.fromEntries(Object.entries(value));
}
function array(value: unknown): unknown[] {
  if (!Array.isArray(value)) throw new Error('Deret kebijakan tidak valid.');
  return value;
}
function numeric(value: unknown, min = 0, max = Number.MAX_SAFE_INTEGER): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) throw new Error('Angka ekspor kebijakan tidak valid.');
  return value;
}
function count(value: unknown): number {
  const n = numeric(value);
  if (!Number.isInteger(n)) throw new Error('Jumlah observasi tidak valid.');
  return n;
}
function text(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error('Identitas stasiun tidak tersedia.');
  return value;
}
function series(value: unknown, length: number, integer = false): Series {
  const items = array(value);
  if (items.length !== length) throw new Error('Panjang deret tidak sesuai kalender.');
  return items.map(item => item === null ? null : integer ? count(item) : numeric(item));
}
function counts(value: unknown, length: number): number[] {
  const items = array(value);
  if (items.length !== length) throw new Error('Panjang deret QC tidak sesuai kalender.');
  return items.map(count);
}
function status(value: unknown): Status {
  if (value !== 'Active' && value !== 'Intermittent' && value !== 'Defective') throw new Error('Status instrumen tidak dikenal.');
  return value;
}
function six<T>(get: (key: Pollutant) => T): Record<Pollutant, T> {
  return { pm25: get('pm25'), pm10: get('pm10'), so2: get('so2'), co: get('co'), o3: get('o3'), no2: get('no2') };
}
export function parsePolicy(rawContext: unknown, rawExposure: unknown): PolicyData {
  const context = object(rawContext), exposure = object(rawExposure);
  if (context['version'] !== 2 || exposure['version'] !== 1) throw new Error('Versi ekspor kebijakan tidak didukung.');
  const dates = array(context['dates']).map(value => {
    const date = text(value);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date) throw new Error('Tanggal kebijakan tidak valid.');
    return date;
  });
  if (!dates.length || dates.some((date, i) => i > 0 && Date.parse(date) - Date.parse(dates[i - 1] ?? '') !== 86400000)
    || JSON.stringify(exposure['dates']) !== JSON.stringify(dates)) throw new Error('Kalender kebijakan tidak sesuai.');
  const observations = object(exposure['stations']);
  const codes = new Set<string>(), hospitals = new Set<string>();
  const stations: PolicyStation[] = array(context['stations']).map(raw => {
    const row = object(raw);
    const code = text(row['code']), hospital = text(row['hospital']);
    if (!/^AQMS-[A-Z0-9]+-\d{2}$/.test(code) || !/^RS-XXX-\d{2}$/.test(hospital) || codes.has(code) || hospitals.has(hospital)) throw new Error('Relasi fasilitas/stasiun tidak valid.');
    codes.add(code); hospitals.add(hospital);
    const observation = object(observations[code]);
    const readMode = (mode: Mode): Record<Pollutant, Series> => {
      const values = object(observation[mode]);
      return six(key => series(values[key], dates.length));
    };
    const measured = { v: readMode('v'), s: readMode('s') };
    const unavailable = array(observation['unavailable']).map(value => {
      const key = text(value);
      if (!POLLUTANTS.some(p => p === key)) throw new Error('Penanda satuan tidak valid.');
      return key;
    });
    for (const key of POLLUTANTS) if (unavailable.includes(key) && [...measured.v[key], ...measured.s[key]].some(value => value !== null)) throw new Error('Satuan tidak terverifikasi berisi paparan numerik.');
    const excluded = object(row['excluded']);
    const recorded = counts(row['recorded'], dates.length);
    const rejected = { v: counts(excluded['v'], dates.length), s: counts(excluded['s'], dates.length) };
    if (recorded.some((n, i) => (rejected.v[i] ?? 0) > n || (rejected.s[i] ?? 0) > (rejected.v[i] ?? 0))) throw new Error('Penyebut QC tidak sesuai.');
    const nearest = object(row['nearest']);
    return { code, hospital, name: text(row['name']), city: text(row['city']), province: text(row['province']), region: text(row['region']), siteType: text(row['siteType']),
      latitude: numeric(row['latitude'], -90, 90), longitude: numeric(row['longitude'], -180, 180), status: status(row['status']),
      beds: row['beds'] === null ? null : numeric(row['beds']), admissions: series(row['admissions'], dates.length, true),
      recorded, excluded: rejected, exposure: measured, unavailable,
      nearest: { code: text(nearest['code']), km: numeric(nearest['km']) } };
  });
  if (!stations.length || Object.keys(observations).length !== stations.length || stations.some(row => row.nearest.code === row.code || !codes.has(row.nearest.code))) throw new Error('Jaringan referensi tidak lengkap.');
  for (const station of stations) {
    const declared = stations.find(item => item.code === station.nearest.code);
    const minimum = Math.min(...stations.filter(item => item.code !== station.code).map(item => distanceKm(station, item)));
    if (!declared || Math.abs(distanceKm(station, declared) - station.nearest.km) > 1e-6 || Math.abs(minimum - station.nearest.km) > 1e-6) throw new Error('Jarak jaringan tidak sesuai koordinat sumber.');
  }
  return { dates, stations };
}
let cache: PolicyData | null = null;
let flight: Promise<PolicyData> | null = null;
export async function loadPolicy(signal: AbortSignal): Promise<PolicyData> {
  if (cache) return cache;
  if (flight) return flight;
  flight = loadOnce(signal);
  try { return await flight; } finally { flight = null; }
}
async function loadOnce(signal: AbortSignal): Promise<PolicyData> {
  const get = (file: string): Promise<unknown> => cachedJson(`./data/${file}`, signal);
  const [context, exposure] = await Promise.all([get('policy_context.json'), get('health_exposure.json')]);
  if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
  cache = parsePolicy(context, exposure);
  return cache;
}
