import { parseDashboard } from './validate';
import type { DashboardData } from './types';

const CACHE_NAME = 'prana-data-v1';

// Serve from Cache Storage if available; falls through to network on miss.
// Clones the response before caching so the stream can be read once more.
export async function json(path: string, signal: AbortSignal): Promise<unknown> {
  if ('caches' in self) {
    try {
      const cache = await caches.open(CACHE_NAME);
      const hit = await cache.match(path);
      if (hit) return hit.json();
      const response = await fetch(path, { signal });
      if (!response.ok) throw new Error(`Data gagal dimuat (${response.status}).`);
      // Write in the background: awaiting a multi-MB put serializes download→write→parse.
      void cache.put(path, response.clone()).catch(() => undefined);
      return response.json();
    } catch (err) {
      // Cache unavailable or aborted — fall through to plain fetch.
      if ((err as { name?: string }).name === 'AbortError') throw err;
    }
  }
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
