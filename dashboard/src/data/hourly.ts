import type { FilterState, PollutantName, Station } from './types';

export const HOURLY_POLLUTANTS: readonly PollutantName[] = ['PM2.5', 'PM10', 'SO2', 'CO', 'O3', 'NO2'];
const COLUMNS = [...HOURLY_POLLUTANTS, 'temperature_c', 'humidity_pct', 'wind_speed_ms', 'wind_direction_deg'];
export interface HourStation { station: Station; traffic: number; hours: Float64Array }
export interface HourlySelection { dates: string[]; stations: HourStation[]; pollutant: PollutantName }
export interface AnalysisRequest { filters: FilterState; stations: readonly Station[] }

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Ekspor per jam tidak valid.');
  return Object.fromEntries(Object.entries(value));
}

export async function loadHourly(request: AnalysisRequest, signal: AbortSignal): Promise<HourlySelection> {
  const response = await fetch('/dashboard/data/hourly/manifest.json', { signal });
  if (!response.ok) throw new Error('Ekspor per jam belum tersedia.');
  const manifest = record(await response.json());
  if (manifest['version'] !== 1 || JSON.stringify(manifest['columns']) !== JSON.stringify(COLUMNS)) throw new Error('Skema per jam tidak didukung.');
  const rawDates = manifest['dates'];
  if (!Array.isArray(rawDates) || !rawDates.every((value: unknown): value is string => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value))) throw new Error('Kalender per jam tidak valid.');
  const dates: string[] = rawDates;
  if (!dates.length || dates.some((day, i) => i > 0 && Date.parse(day) - Date.parse(dates[i-1] ?? '') !== 86400000)) throw new Error('Kalender per jam tidak berurutan.');
  const { filters } = request;
  const pollutant = HOURLY_POLLUTANTS.find(name => name === (filters.pollutant ?? 'PM2.5'));
  if (!pollutant) throw new Error('Polutan tidak didukung.');
  const start = filters.startDate ?? dates[0] ?? '';
  const end = filters.endDate ?? dates.at(-1) ?? '';
  const selectedDates = dates.filter(day => day >= start && day <= end);
  const inventory = record(manifest['stations']);
  const selected = request.stations.filter(station => (filters.region === 'all' || station.region === filters.region)
    && (filters.siteType === 'all' || station.siteType === filters.siteType)
    && (filters.station === 'all' || station.code === filters.station));
  const output: HourStation[] = [];
  if (!selectedDates.length) return { dates: [], stations: [], pollutant };
  const first = dates.indexOf(selectedDates[0] ?? '');
  // Bounded concurrency keeps decompression and temporary buffers small on phones.
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(4, selected.length) }, async () => {
    while (next < selected.length) {
      const station = selected[next++];
      if (!station) break;
      const metadata = record(inventory[station.code]);
      if (typeof metadata['traffic'] !== 'number' || !Number.isFinite(metadata['traffic'])) throw new Error('Metadata lalu lintas tidak valid.');
      const mode = filters.includeSuspect ? 's' : 'v';
      const hashes = record(metadata['hashes']);
      const expectedHash = hashes[mode];
      if (typeof expectedHash !== 'string') throw new Error('Provenans per jam hilang.');
      const loaded = await fetch(`/dashboard/data/hourly/${station.code}-${mode}.bin`, { signal });
      if (!loaded.ok) throw new Error(`Data ${station.code} belum dapat dimuat.`);
      const compressed = await loaded.arrayBuffer();
      const digest = await crypto.subtle.digest('SHA-256', compressed);
      const hash = [...new Uint8Array(digest)].map(value => value.toString(16).padStart(2, '0')).join('');
      if (hash !== expectedHash) throw new Error(`Ekspor ${station.code} tidak cocok dengan manifest.`);
      const unpacked = await new Response(new Blob([compressed]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
      if (unpacked.byteLength !== dates.length * 24 * 10 * 8) throw new Error('Panjang deret per jam tidak valid.');
      const view = new DataView(unpacked);
      const hours = new Float64Array(selectedDates.length * 24 * 10);
      for (let i = 0; i < hours.length; i++) {
        const value = view.getFloat64((first * 240 + i) * 8, true);
        if (!Number.isNaN(value) && (!Number.isFinite(value) || (i % 10 < 6 && value < 0))) throw new Error('Nilai ekspor per jam tidak valid.');
        hours[i] = value;
      }
      output.push({ station, traffic: metadata['traffic'], hours });
    }
  }));
  output.sort((a, b) => a.station.code.localeCompare(b.station.code));
  return { dates: selectedDates, stations: output, pollutant };
}

export function quantile(values: readonly number[], fraction: number): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a-b), position = (sorted.length-1)*fraction;
  const low = sorted[Math.floor(position)], high = sorted[Math.ceil(position)];
  return low === undefined || high === undefined ? null : low+(high-low)*(position-Math.floor(position));
}
export function mean(values: readonly number[]): number | null { return values.length ? values.reduce((a, b) => a+b, 0)/values.length : null; }
export function at(station: HourStation, hour: number, column: number): number | null {
  const value = station.hours[hour*10+column];
  return value === undefined || !Number.isFinite(value) ? null : value;
}
export function calendar(dates: readonly string[]): { dow: number; haze: boolean }[] {
  return dates.map(day => { const date = new Date(`${day}T00:00:00Z`); return { dow: (date.getUTCDay()+6)%7, haze: [8,9,10].includes(date.getUTCMonth()+1) }; });
}
