import { loadHourly } from './hourly';
import type { AnalysisRequest } from './hourly';
import type { AnalysisResponse } from './analysis-cache';
import { aggregateTemporal } from '../features/temporal/aggregate';
import { aggregateDrivers } from '../features/drivers/aggregate';

self.addEventListener('message', (event: MessageEvent<AnalysisRequest>) => {
  const request = event.data;
  void loadHourly(request, new AbortController().signal).then(selection => {
    const response: AnalysisResponse = { ok: true, data: {
      temporal: aggregateTemporal(selection), drivers: aggregateDrivers(selection),
    } };
    self.postMessage(response);
  }).catch((error: unknown) => self.postMessage({ ok:false, error:error instanceof Error ? error.message : 'Analisis belum dapat dimuat.' }));
});
