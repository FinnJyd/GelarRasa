import type { FilterState, Station } from '../../data/types';
import { button, emptyState } from '../../shared/dom';
import { loadHealth } from './load';
import { mountHealthView } from './view';

export function mountHealth(host: HTMLElement, catalog: readonly Station[], initial: FilterState): {
  update: (filters: FilterState) => void; destroy: () => void;
} {
  const controller = new AbortController();
  let state = initial;
  let view: ReturnType<typeof mountHealthView> | null = null;
  const load = async (): Promise<void> => {
    const status = emptyState('Memuat data kesehatan…', 'Menyiapkan kasus harian dan paparan berpasangan.');
    status.setAttribute('role', 'status');
    host.replaceChildren(status);
    try {
      const data = await loadHealth(controller.signal);
      if (controller.signal.aborted) return;
      if (catalog.some(station => !data.stations[station.code])) throw new Error('Relasi stasiun tidak tersedia.');
      view = mountHealthView(host, data, catalog, state);
    } catch (error: unknown) {
      if (controller.signal.aborted) return;
      console.error('Health export could not be loaded:', error);
      const failure = emptyState('Data kesehatan belum dapat dimuat', 'Periksa berkas ekspor dan koneksi, lalu coba lagi.');
      failure.setAttribute('role', 'alert');
      const retry = button('Coba lagi', 'button button-primary');
      retry.addEventListener('click', () => { void load(); }, { once: true, signal: controller.signal });
      failure.append(retry);
      host.replaceChildren(failure);
    }
  };
  void load();
  return { update: filters => { state = filters; view?.update(filters); }, destroy: () => { controller.abort(); view?.destroy(); host.replaceChildren(); } };
}
