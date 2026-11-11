import { POLLUTANT_KEYS } from './types';
import type { HealthData, HealthStation, PollutantKey, Series } from './types';

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Struktur ekspor kesehatan tidak valid.');
  return Object.fromEntries(Object.entries(value));
}
function array(value: unknown): unknown[] {
  if (!Array.isArray(value)) throw new Error('Deret kesehatan tidak valid.');
  return value;
}
function numeric(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) throw new Error('Nilai kesehatan tidak valid.');
  return value;
}
function series(value: unknown, length: number, counts = false): Series {
  const values = array(value);
  if (values.length !== length) throw new Error('Panjang deret tidak sesuai tanggal.');
  return values.map(item => {
    if (item === null) return null;
    const n = numeric(item);
    if (counts && !Number.isInteger(n)) throw new Error('Jumlah kasus bukan bilangan bulat.');
    return n;
  });
}
export function parseHealth(rawOutcomes: unknown, rawExposure: unknown): HealthData {
  const outcomes = record(rawOutcomes);
  const exposure = record(rawExposure);
  if (outcomes['version'] !== 1 || exposure['version'] !== 1) throw new Error('Versi ekspor kesehatan tidak didukung.');
  const dates = array(outcomes['dates']).map(value => {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)
      || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value) throw new Error('Tanggal kesehatan tidak valid.');
    return value;
  });
  if (!dates.length || dates.some((date, index) => index > 0 && Date.parse(date) - Date.parse(dates[index - 1] ?? '') !== 86400000)) throw new Error('Kalender kesehatan tidak berurutan.');
  if (JSON.stringify(exposure['dates']) !== JSON.stringify(dates)) throw new Error('Kalender paparan tidak sesuai.');
  const facilities = record(outcomes['stations']);
  const observations = record(exposure['stations']);
  if (Object.keys(facilities).sort().join() !== Object.keys(observations).sort().join()) throw new Error('Cakupan stasiun tidak sesuai.');
  const stations: Record<string, HealthStation> = {};
  const seen = new Set<string>();
  for (const [code, value] of Object.entries(facilities)) {
    const hospital = record(value);
    const observation = record(observations[code]);
    const id = hospital['hospital'];
    if (typeof id !== 'string' || !/^RS-XXX-\d+$/.test(id) || seen.has(id)) throw new Error('Relasi rumah sakit tidak valid.');
    seen.add(id);
    const raw = record(hospital['outcomes']);
    const v = record(observation['v']);
    const s = record(observation['s']);
    const unavailable = array(observation['unavailable']).map(item => {
      if (typeof item !== 'string' || !POLLUTANT_KEYS.some(key => key === item)) throw new Error('Status satuan tidak valid.');
      return item;
    });
    const beds = numeric(hospital['beds']);
    if (beds === 0) throw new Error('Kapasitas tidak tersedia.');
    const mode = (input: Record<string, unknown>): Record<PollutantKey, Series> => ({
      pm25: series(input['pm25'], dates.length), pm10: series(input['pm10'], dates.length),
      so2: series(input['so2'], dates.length), co: series(input['co'], dates.length),
      o3: series(input['o3'], dates.length), no2: series(input['no2'], dates.length),
    });
    stations[code] = { hospital: id, beds, outcomes: {
      resp: series(raw['resp'], dates.length, true),
      resp_admissions_under5: series(raw['resp_admissions_under5'], dates.length, true),
      resp_admissions_over60: series(raw['resp_admissions_over60'], dates.length, true),
      asthma_emergency_cases: series(raw['asthma_emergency_cases'], dates.length, true),
      copd_admissions: series(raw['copd_admissions'], dates.length, true),
      cvd: series(raw['cvd'], dates.length, true), death: series(raw['death'], dates.length, true),
    },
      exposure: { v: mode(v), s: mode(s) }, unavailable };
  }
  if (!seen.size) throw new Error('Ekspor kesehatan kosong.');
  return { dates, stations, discrepancies: numeric(outcomes['resp_discrepancies']) };
}
let cached: HealthData | null = null;
export async function loadHealth(signal: AbortSignal): Promise<HealthData> {
  if (cached) return cached;
  const request = new AbortController();
  const combined = AbortSignal.any([signal, request.signal]);
  const get = async (file: string): Promise<unknown> => {
    const response = await fetch(`./data/${file}`, { signal: combined });
    if (!response.ok) throw new Error(`Ekspor kesehatan tidak tersedia (${response.status}).`);
    return response.json();
  };
  try {
    const [outcomes, exposure] = await Promise.all([get('health_outcomes.json'), get('health_exposure.json')]);
    if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
    cached = parseHealth(outcomes, exposure);
    return cached;
  } finally { request.abort(); }
}
