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
};
