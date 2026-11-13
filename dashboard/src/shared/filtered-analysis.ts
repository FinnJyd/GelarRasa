import type { AnalysisCache, AnalysisResults } from '../data/analysis-cache';
import type { FilterState } from '../data/types';
import { button, element, emptyState } from './dom';

export function filteredAnalysis<T>(
  host: HTMLElement,
  cache: AnalysisCache,
  select: (results: AnalysisResults) => T,
  render: (data: T) => { destroy: () => void; update: (data: T) => void },
): { update: (filters: FilterState) => void; destroy: () => void } {
  let view: ReturnType<typeof render> | null = null;
  let revision = 0;
  let active = true;
  let controller = new AbortController();
  const status = element('p', 'panel-footnote', 'Memperbarui analisis sesuai filter…');
  status.setAttribute('role', 'status');

  const show = (results: AnalysisResults): void => {
    const data = select(results);
    if (view) view.update(data);
    else view = render(data);
    status.remove();
    host.inert = false;
    host.removeAttribute('aria-busy');
  };

  const update = (filters: FilterState): void => {
    const current = ++revision;
    controller.abort(); controller = new AbortController();
    const cached = cache.peek(filters);
    if (cached) { show(cached); return; }
    host.setAttribute('aria-busy', 'true');
    host.inert = true;
    if (view) host.prepend(status);
    else host.replaceChildren(emptyState('Memuat analisis pilihan…', 'Menyiapkan data sesuai filter.'));
    void cache.prepare(filters).then(results => {
      if (active && current === revision) show(results);
    }).catch((error: unknown) => {
      if (!active || current !== revision || (error instanceof DOMException && error.name === 'AbortError')) return;
      view?.destroy(); view = null;
      host.removeAttribute('aria-busy'); host.inert = false;
      const state = emptyState('Analisis belum dapat dimuat', error instanceof Error ? error.message : 'Ekspor analisis belum dapat diproses.');
      state.setAttribute('role', 'alert');
      const retry = button('Coba lagi', 'button button-primary');
      retry.addEventListener('click', () => update(filters), { once: true, signal: controller.signal });
      state.append(retry); host.replaceChildren(state);
    });
  };

  return {
    update,
    destroy(): void {
      active = false; revision++; controller.abort();
      view?.destroy(); view = null;
      host.removeAttribute('aria-busy'); host.inert = false; host.replaceChildren();
    },
  };
}
