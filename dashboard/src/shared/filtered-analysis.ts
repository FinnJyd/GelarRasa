import type { AnalysisRequest } from '../data/hourly';
import { button, element, emptyState } from './dom';

export function filteredAnalysis<T>(host: HTMLElement, render: (data: T) => {destroy: () => void; update: (data:T) => void}): {
  update: (request: AnalysisRequest) => void; destroy: () => void;
} {
  let worker: Worker | null = null;
  let view: ReturnType<typeof render> | null = null;
  let controller = new AbortController();
  let active = true;
  // Static exports never change within a session, so repeat requests render without a worker round-trip.
  const results = new Map<string, T>();
  const keyOf = (request: AnalysisRequest): string => `${request.feature}:${JSON.stringify(request.filters)}:${request.stations.map(station => station.code).join(',')}`;
  const remember = (key: string, data: T): void => {
    results.delete(key); results.set(key, data);
    if (results.size > 6) { const oldest = results.keys().next().value; if (oldest !== undefined) results.delete(oldest); }
  };
  const status = element('p', 'panel-footnote', 'Memperbarui analisis sesuai filter…');
  status.setAttribute('role', 'status');
  const update = (request: AnalysisRequest): void => {
    worker?.terminate(); controller.abort(); controller = new AbortController();
    const key = keyOf(request);
    const hit = results.get(key);
    if (hit !== undefined) {
      status.remove(); host.inert = false; host.removeAttribute('aria-busy');
      if (view) view.update(hit); else view = render(hit);
      return;
    }
    host.setAttribute('aria-busy','true');
    host.inert = true;
    if (view) host.prepend(status);
    if (!view) host.replaceChildren(emptyState('Memuat analisis pilihan…','Menyiapkan data sesuai filter.'));
    worker = new Worker(new URL('../data/analysis-worker.ts',import.meta.url), {type:'module'});
    const current = worker;
    const fail = (message: string): void => {
      if(!active || current!==worker) return;
      view?.destroy(); view=null; host.removeAttribute('aria-busy');
      host.inert = false;
      const state=emptyState('Analisis belum dapat dimuat',message); state.setAttribute('role','alert');
      const retry=button('Coba lagi','button button-primary');
      retry.addEventListener('click',()=>update(request),{once:true,signal:controller.signal}); state.append(retry); host.replaceChildren(state);
      current.terminate(); worker=null;
    };
    current.addEventListener('error',()=>fail('Ekspor analisis belum dapat diproses.'),{signal:controller.signal});
    current.addEventListener('message',(event:MessageEvent<{ok:true;data:T}|{ok:false;error:string}>)=>{
      if(!active || current!==worker) return;
      if(!event.data.ok) {fail(event.data.error);return;}
      remember(key, event.data.data);
      if(view) view.update(event.data.data); else view=render(event.data.data);
      status.remove(); host.inert = false;
      host.removeAttribute('aria-busy'); current.terminate(); worker=null;
    },{signal:controller.signal});
    current.postMessage(request);
  };
  return {update,destroy:()=>{active=false;controller.abort();worker?.terminate();view?.destroy();host.removeAttribute('aria-busy');host.inert=false;host.replaceChildren();}};
}
