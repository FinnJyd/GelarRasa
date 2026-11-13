import { loadHourly } from './hourly';
import type { AnalysisRequest } from './hourly';
import { aggregateTemporal } from '../features/temporal/aggregate';
import { aggregateDrivers } from '../features/drivers/aggregate';

self.addEventListener('message', (event: MessageEvent<AnalysisRequest>) => {
  const request = event.data;
  void loadHourly(request, new AbortController().signal).then(selection => {
    const data = request.feature === 'temporal' ? aggregateTemporal(selection) : aggregateDrivers(selection);
    self.postMessage({ ok:true, data });
  }).catch((error: unknown) => self.postMessage({ ok:false, error:error instanceof Error ? error.message : 'Analisis belum dapat dimuat.' }));
});
