import { mountUnavailable } from '../../shared/unavailable-feature';
import type { Feature } from '../../data/types';

export const health: Feature = {
  id: 'health', title: 'Dampak Kesehatan', icon: 'heart',
  question: "Berapa jeda waktu (lag 0–7 hari) paparan PM2.5 terhadap lonjakan ISPA, dan kelompok usia mana yang paling rentan menanggung beban admisi faskes?",
  mount: host => mountUnavailable(
    host,
    "Epidemiologi Lingkungan: Kerentanan Balita/Lansia & Tekanan RS",
    "Korelasi silang jeda waktu (Lag 0–7 Hari), kurva dosis-respons, dan event-study lonjakan admisi saat krisis.",
    "Grafik korelasi silang Lag 0–7 hari, perbandingan kerentanan ISPA balita vs lansia, dan indikator proksi kapasitas tempat tidur rumah sakit (*hospital bed strain*).",
    "Modul Visualisasi Tab 5",
  ),
};
