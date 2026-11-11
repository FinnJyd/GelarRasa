import { mountUnavailable } from '../../shared/unavailable-feature';
import type { Feature } from '../../data/types';

export const recommendations: Feature = {
  id: 'recommendations', title: 'Rekomendasi Kebijakan', icon: 'spark',
  question: "Intervensi kebijakan apa yang paling efektif secara biaya-manfaat untuk menurunkan risiko kematian dini dan beban faskes masa depan?",
  mount: host => mountUnavailable(
    host,
    "Rekomendasi Kebijakan, Simulator Lonjakan RS & Ekspansi Jaringan AQMS",
    "Simulasi interaktif kapasitas faskes berbasis koefisien Distributed Lag Model serta prioritas lokasi sensor baru.",
    "Mencakup: Tangga Peringatan Dini Kesehatan, Simulator Lonjakan Kapasitas Rumah Sakit (Distributed Lag Model), dan Papan Peringkat Prioritas Ekspansi Stasiun (Haversine & Bobot Multi-Faktor).",
    "Modul Visualisasi Tab 6",
  ),
};
