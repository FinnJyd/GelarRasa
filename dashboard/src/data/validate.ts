import { CATEGORIES } from './types';
import type { Category, DashboardData, Station } from './types';

type RecordValue = Record<string, unknown>;

function isRecord(value: unknown): value is RecordValue {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function record(value: unknown, path: string): RecordValue {
  if (!isRecord(value)) {
    throw new Error(`${path}: objek data tidak valid.`);
  }
  return value;
}

function text(value: unknown, path: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${path}: teks tidak valid.`);
  return value;
}

function numeric(value: unknown, path: string, minimum = 0, maximum = Infinity): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < minimum || value > maximum) {
    throw new Error(`${path}: angka di luar rentang yang didukung.`);
  }
  return value;
}

function integer(value: unknown, path: string, minimum = 0): number {
  const result = numeric(value, path, minimum);
  if (!Number.isInteger(result)) throw new Error(`${path}: jumlah harus bilangan bulat.`);
  return result;
}

function isoDate(value: unknown, path: string): string {
  const result = text(value, path);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(result) || new Date(result).toISOString().slice(0, 10) !== result) {
    throw new Error(`${path}: tanggal tidak valid.`);
  }
  return result;
}

function list(value: unknown, path: string): unknown[] {
  if (!Array.isArray(value)) throw new Error(`${path}: daftar data tidak valid.`);
  return value;
}

function category(value: unknown): Category {
  for (const item of CATEGORIES) if (item === value) return item;
  throw new Error('Kategori ekspor tidak dikenali.');
}

export function parseDashboard(raw: unknown, rawCatalog: unknown): DashboardData {
  const root = record(raw, 'dashboard');
  const meta = record(root['meta'], 'meta');
  const kpi = record(root['kpi'], 'kpi');
  const detail = record(kpi['hospital_burden_detail'], 'hospital_burden_detail');
  const catalog = new Map<string, RecordValue>();
  for (const entry of list(rawCatalog, 'catalog')) {
    const row = record(entry, 'station catalog');
    const code = text(row['code'], 'code');
    if (catalog.has(code)) throw new Error(`Duplikat katalog ${code}.`);
    catalog.set(code, row);
  }
  const codes = new Set<string>();
  const stations: Station[] = list(root['pm25_ranking'], 'pm25_ranking').map(entry => {
    const row = record(entry, 'station');
    const code = text(row['station_code'], 'station_code');
    if (codes.has(code)) throw new Error(`Duplikat stasiun ${code}.`);
    codes.add(code);
    const dimension = catalog.get(code);
    if (!dimension) throw new Error(`Katalog tidak memuat ${code}.`);
    return {
      code,
      name: text(row['station_name'], 'station_name'),
      city: text(dimension['city'], 'city'),
      province: text(dimension['province'], 'province'),
      region: text(dimension['region'], 'region'),
      siteType: text(dimension['siteType'], 'siteType'),
      notes: text(dimension['notes'], 'notes'),
      latitude: numeric(dimension['latitude'], 'latitude', -90, 90),
      longitude: numeric(dimension['longitude'], 'longitude', -180, 180),
      average: numeric(row['avg_pm25'], 'avg_pm25'),
      exceedance: numeric(row['pct_exceed_24h'], 'pct_exceed_24h', 0, 100),
      validPercentage: numeric(row['pct_valid'], 'pct_valid', 0, 100),
      category: category(row['dominant_ispu_cat']),
    };
  });
  if (stations.length !== integer(meta['total_stations'], 'total_stations', 1)) {
    throw new Error('Jumlah stasiun tidak cocok dengan metadata.');
  }
  const start = isoDate(meta['date_range_start'], 'date_range_start');
  const end = isoDate(meta['date_range_end'], 'date_range_end');
  if (start > end) throw new Error('Rentang tanggal ekspor tidak valid.');
  const generated = text(meta['generated_at'], 'generated_at');
  if (!Number.isFinite(Date.parse(generated))) throw new Error('Waktu ekspor tidak valid.');
  let cube: DashboardData['cube'];
  if (root['daily_cube'] && isRecord(root['daily_cube'])) {
    const stationRows = record(root['daily_cube']['stations'], 'daily_cube.stations');
    for (const value of Object.values(stationRows)) {
      const station = record(value, 'daily_cube.station');
      for (const key of list(station['unavailable'], 'daily_cube.unavailable')) {
        if (typeof key !== 'string' || !['pm25', 'pm10', 'so2', 'co', 'o3', 'no2'].includes(key)) throw new Error('Polutan tidak tersedia tidak valid.');
      }
    }
    cube = root['daily_cube'] as unknown as DashboardData['cube'];
  }
  return {
    start, end, generated, stations,
    nationalExceedance: numeric(kpi['pct_days_exceed_24h'], 'pct_days_exceed_24h', 0, 100),
    reference: {
      daily: numeric(meta['pp22_threshold_24h_ugm3'], 'pp22_threshold_24h_ugm3', 0.01),
      annual: numeric(meta['pp22_threshold_annual_ugm3'], 'pp22_threshold_annual_ugm3', 0.01),
      whoAnnual: numeric(meta['who_guideline_annual_ugm3'], 'who_guideline_annual_ugm3', 0.01),
    },
    hospital: {
      burden: numeric(kpi['hospital_burden_index'], 'hospital_burden_index'),
      dailyAdmissions: numeric(detail['avg_daily_resp_admissions'], 'avg_daily_resp_admissions'),
      beds: integer(detail['total_bed_capacity'], 'total_bed_capacity', 1),
      hospitals: integer(detail['total_hospitals'], 'total_hospitals', 1),
      days: integer(detail['days_observed'], 'days_observed', 1),
    },
    ...(cube ? { cube } : {}),
  };
}
