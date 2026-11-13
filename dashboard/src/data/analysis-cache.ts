import type { AnalysisRequest } from './hourly';
import type { FilterState, Station } from './types';
import type { TemporalData } from '../features/temporal/types';
import type { DriversData } from '../features/drivers/types';

export interface AnalysisResults {
  temporal: TemporalData;
  drivers: DriversData;
}

export type AnalysisResponse = { ok: true; data: AnalysisResults } | { ok: false; error: string };
export type AnalysisRunner = (request: AnalysisRequest, signal: AbortSignal) => Promise<AnalysisResults>;

export interface AnalysisCache {
  prepare: (filters: FilterState) => Promise<AnalysisResults>;
  peek: (filters: FilterState) => AnalysisResults | null;
  destroy: () => void;
}

function aborted(): DOMException {
  return new DOMException('Perhitungan digantikan atau ditutup.', 'AbortError');
}

const runWorker: AnalysisRunner = (request, signal) => new Promise((resolve, reject) => {
  if (signal.aborted) { reject(aborted()); return; }
  const worker = new Worker(new URL('./analysis-worker.ts', import.meta.url), { type: 'module' });
  const cleanup = (): void => {
    worker.terminate();
    signal.removeEventListener('abort', cancel);
  };
  const cancel = (): void => { cleanup(); reject(aborted()); };
  signal.addEventListener('abort', cancel, { once: true });
  worker.addEventListener('error', () => {
    cleanup(); reject(new Error('Ekspor analisis belum dapat diproses.'));
  }, { once: true });
  worker.addEventListener('message', (event: MessageEvent<AnalysisResponse>) => {
    cleanup();
    if (event.data.ok) resolve(event.data.data);
    else reject(new Error(event.data.error));
  }, { once: true });
  worker.postMessage(request);
});

export function createAnalysisCache(
  stations: readonly Station[],
  range: { start: string; end: string },
  run: AnalysisRunner = runWorker,
): AnalysisCache {
  let key: string | null = null;
  let result: AnalysisResults | null = null;
  let pending: Promise<AnalysisResults> | null = null;
  let controller: AbortController | null = null;
  let revision = 0;
  let disposed = false;

  const snapshot = (filters: FilterState): FilterState => ({
    region: filters.region, siteType: filters.siteType, station: filters.station,
    startDate: filters.startDate ?? range.start, endDate: filters.endDate ?? range.end,
    pollutant: filters.pollutant ?? 'PM2.5', includeSuspect: filters.includeSuspect ?? false,
  });
  const filterKey = (filters: FilterState): string => JSON.stringify(snapshot(filters));

  return {
    peek: filters => !disposed && key === filterKey(filters) ? result : null,
    prepare(filters): Promise<AnalysisResults> {
      if (disposed) return Promise.reject(aborted());
      const scope = snapshot(filters);
      const nextKey = filterKey(scope);
      if (nextKey === key) {
        if (result) return Promise.resolve(result);
        if (pending) return pending;
      }
      const current = ++revision;
      controller?.abort();
      const request = new AbortController();
      controller = request;
      key = nextKey;
      result = null;
      // Keep only the latest filter result; prior scopes must not accumulate in memory.
      const calculation = Promise.resolve().then(() => {
        if (request.signal.aborted) throw aborted();
        return run({ filters: scope, stations }, request.signal);
      });
      pending = calculation.then(value => {
        if (disposed || revision !== current) throw aborted();
        result = value;
        pending = null;
        controller = null;
        return value;
      }, (error: unknown) => {
        if (revision === current) {
          key = null; result = null; pending = null; controller = null;
        }
        throw error;
      });
      return pending;
    },
    destroy(): void {
      disposed = true;
      revision++;
      controller?.abort();
      controller = null; pending = null; result = null; key = null;
    },
  };
}
