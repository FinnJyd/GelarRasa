import type { Feature, FilterState } from '../../data/types';
import { button, emptyState } from '../../shared/dom';
import { loadPolicy } from './load';
import { mountPolicyView } from './view';

export { loadPolicy } from './load';
export { preloadNetwork } from './network-view';

export function createRecommendations(ready: Promise<void>, getFilters: () => FilterState): { feature: Feature; update: (filters: FilterState) => void } {
  let view: ReturnType<typeof mountPolicyView> | null = null;
  const feature: Feature = {
    id: 'recommendations', title: 'Rekomendasi Kebijakan', icon: 'spark',
    question: 'Wilayah mana yang perlu diprioritaskan untuk peninjauan tindakan, kesiapsiagaan faskes, dan penguatan jaringan pemantauan berdasarkan data yang tersedia?',
    mount: host => {
      const controller = new AbortController();
      const load = async (): Promise<void> => {
        const loading = emptyState('Memuat bukti kebijakan…', 'Menyiapkan usulan tindakan dan bukti lokasi.');
        loading.setAttribute('role', 'status'); host.replaceChildren(loading);
        try {
          const data = await loadPolicy(controller.signal);
          await ready;
          if (!controller.signal.aborted) view = mountPolicyView(host, data, getFilters());
        } catch (error: unknown) {
          if (controller.signal.aborted) return;
          console.error('Policy export could not be loaded:', error);
          const failure = emptyState('Bukti kebijakan belum dapat dimuat', 'Periksa berkas ekspor dan koneksi, lalu coba lagi.'); failure.setAttribute('role', 'alert');
          const retry = button('Coba lagi', 'button button-primary');
          retry.addEventListener('click', () => { void load(); }, { once: true, signal: controller.signal });
          failure.append(retry); host.replaceChildren(failure);
        }
      };
      void load();
      return () => { controller.abort(); view?.destroy(); view = null; host.replaceChildren(); };
    },
  };
  return { feature, update: filters => view?.update(filters) };
}
