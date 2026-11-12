<<<<<<< HEAD
import { mountUnavailable } from '../../shared/unavailable-feature';
import type { Feature } from '../../data/types';

export const drivers: Feature = {
  id: 'drivers', title: 'Faktor Pemicu', icon: 'wind',
  question: "Faktor meteorologi, arah angin (mawar polusi), dan aktivitas antropogenik apa yang menjadi pemicu utama konsentrasi ekstrem polutan di berbagai zonasi?",
  mount: host => mountUnavailable(
    host,
    "Faktor Pemicu: Meteorologi & Emisi Koridor Lalu Lintas",
    "Korelasi peringkat Spearman, mawar polusi 16 sektor arah angin, dan interaksi volume kendaraan terhadap gas NO2/CO.",
    "Mawar polusi (Pollution Rose), heatmap matriks korelasi cuaca (suhu, kelembapan, angin), binned plot polusi vs angin, dan scatter plot intensitas lalu lintas.",
    "Modul Visualisasi Tab 4",
  ),
=======
import type { Feature } from '../../data/types';
import { button, emptyState } from '../../shared/dom';
import { loadDrivers } from './load';
import { mountDriversView } from './view';

export const drivers: Feature = {
  id: 'drivers',
  title: 'Faktor Pemicu',
  icon: 'wind',
  question:
    'Faktor meteorologi, arah angin (mawar polusi), dan aktivitas antropogenik apa yang menjadi pemicu utama konsentrasi ekstrem polutan di berbagai zonasi?',
  mount: (host: HTMLElement) => {
    const controller = new AbortController();
    let view: ReturnType<typeof mountDriversView> | null = null;

    const load = async (): Promise<void> => {
      const status = emptyState(
        'Memuat data faktor pemicu…',
        'Menyiapkan mawar polusi, korelasi cuaca, dispersi angin, dan komparasi konsentrasi ekstrem.',
      );
      status.setAttribute('role', 'status');
      host.replaceChildren(status);

      try {
        const data = await loadDrivers(controller.signal);
        if (controller.signal.aborted) return;
        view = mountDriversView(host, data);
      } catch (error: unknown) {
        if (controller.signal.aborted) return;
        console.error('Drivers export could not be loaded:', error);
        const failure = emptyState(
          'Data faktor pemicu belum dapat dimuat',
          'Periksa berkas ekspor tab4_drivers.json lalu coba lagi.',
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
