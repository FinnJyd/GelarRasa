<<<<<<< HEAD
import { mountUnavailable } from '../../shared/unavailable-feature';
import type { Feature } from '../../data/types';

export const temporal: Feature = {
  id: 'temporal', title: 'Pola Waktu', icon: 'clock',
  question: "Kapan jam dan periode puncak lonjakan polutan terjadi dalam siklus diurnal 24 jam, dan bagaimana anomali musiman karhutla mengubah drastis profil polusi?",
  mount: host => mountUnavailable(
    host,
    "Dinamika Temporal, Jam Sibuk & Episode Asap Gambut",
    "Analisis profil 24 jam (jam sibuk vs inversi malam), matriks hari × jam (weekday vs weekend), dan linimasa karhutla.",
    "Grafik diurnal per jam 00–23 per tipologi zonasi, heatmap hari × jam, deret waktu stasiun hotspot karhutla (KTG-01, KTG-02, JMB-01/02), dan durasi episode ekstrim.",
    "Modul Visualisasi Tab 3",
  ),
=======
import type { Feature } from '../../data/types';
import { button, emptyState } from '../../shared/dom';
import { loadTemporal } from './load';
import { mountTemporalView } from './view';

export const temporal: Feature = {
  id: 'temporal',
  title: 'Pola Waktu',
  icon: 'clock',
  question:
    'Kapan jam dan periode puncak lonjakan polutan terjadi dalam siklus diurnal 24 jam, dan bagaimana anomali musiman karhutla mengubah drastis profil polusi?',
  mount: (host: HTMLElement) => {
    const controller = new AbortController();
    let view: ReturnType<typeof mountTemporalView> | null = null;

    const load = async (): Promise<void> => {
      const status = emptyState(
        'Memuat data pola waktu…',
        'Menyiapkan siklus diurnal 24 jam, heatmap mingguan, deret waktu, dan analisis episode.',
      );
      status.setAttribute('role', 'status');
      host.replaceChildren(status);

      try {
        const data = await loadTemporal(controller.signal);
        if (controller.signal.aborted) return;
        view = mountTemporalView(host, data);
      } catch (error: unknown) {
        if (controller.signal.aborted) return;
        console.error('Temporal export could not be loaded:', error);
        const failure = emptyState(
          'Data pola waktu belum dapat dimuat',
          'Periksa berkas ekspor tab3_temporal.json lalu coba lagi.',
        );
        failure.setAttribute('role', 'alert');
        const retry = button('Coba lagi', 'button button-primary');
        retry.addEventListener('click', () => { void load(); }, { once: true, signal: controller.signal });
        failure.append(retry);
        host.replaceChildren(failure);
      }
    };

    void load();

    return () => {
      controller.abort();
      view?.destroy();
      host.replaceChildren();
    };
  },
>>>>>>> f6471f0 (Added Tab 2 & 3 + Fixed Project Directory)
};
