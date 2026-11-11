import { parseDashboard } from './validate';
import type { DashboardData } from './types';

async function json(path: string, signal: AbortSignal): Promise<unknown> {
  const response = await fetch(path, { signal });
  if (!response.ok) throw new Error(`Data gagal dimuat (${response.status}).`);
  return response.json();
}

export async function loadDashboard(signal: AbortSignal): Promise<DashboardData> {
  const [raw, catalog] = await Promise.all([
    json('./tab1_ikhtisar.json', signal),
    json('./data/station_catalog.json', signal),
  ]);
  return parseDashboard(raw, catalog);
}
