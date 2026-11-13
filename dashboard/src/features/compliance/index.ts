import type { FilterState, Station } from '../../data/types';
import { button, emptyState } from '../../shared/dom';
import { loadCompliance } from './load';
import { mountComplianceView } from './view';

export { loadCompliance } from './load';

export function mountCompliance(host: HTMLElement, catalog: readonly Station[], initial: FilterState) {
  const controller = new AbortController();
  let state = initial;
  let view: ReturnType<typeof mountComplianceView> | null = null;
  const load = async (): Promise<void> => {
    const status = emptyState('Memuat data kepatuhan…', 'Menyiapkan agregasi enam polutan dan estimasi IKU.');
    status.setAttribute('role', 'status'); host.replaceChildren(status);
    try {
      const data = await loadCompliance(controller.signal);
      if (controller.signal.aborted) return;
      if (catalog.some(station => !data.stations[station.code])) throw new Error('Katalog dan ekspor kepatuhan tidak cocok.');
      view = mountComplianceView(host, data, catalog, state);
    } catch (error: unknown) {
      if (controller.signal.aborted) return;
      console.error('Compliance export could not be loaded:', error);
      const failure = emptyState('Data kepatuhan belum dapat dimuat', 'Periksa ekspor data lalu coba lagi. Tidak ada nilai pengganti.');
      failure.setAttribute('role', 'alert');
      const retry = button('Coba lagi', 'button button-primary');
      retry.addEventListener('click', () => { void load(); }, { once: true, signal: controller.signal });
      failure.append(retry); host.replaceChildren(failure);
    }
  };
  void load();
  return { update: (filters: FilterState) => { state = filters; view?.update(filters); }, destroy: () => { controller.abort(); view?.destroy(); host.replaceChildren(); } };
}
