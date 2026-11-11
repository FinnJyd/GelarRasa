import { mountUnavailable } from '../../shared/unavailable-feature';
import type { Feature } from '../../data/types';

export const compliance: Feature = {
  id: 'compliance', title: 'Kepatuhan Regulasi', icon: 'shield',
  question: "Sejauh mana stasiun AQMS mematuhi ambang batas baku mutu PP 22/2021 dan standar WHO 2021, serta provinsi mana yang paling rentan gagal patuh?",
  mount: host => mountUnavailable(
    host,
    "Audit Kepatuhan Regulasi Udara Nasional (PP 22/2021 & Permen LHK 27/2021)",
    "Evaluasi batas tahunan 15 µg/m³, batas 24 jam 55 µg/m³, dan estimasi capaian Indeks Kualitas Udara (IKU) daerah.",
    "Mencakup: Heatmap Stasiun × Bulan (2024–2026), 100% Stacked Bar Kategori ISPU, Audit Kepatuhan PP 22/2021, dan Rekapitulasi Kinerja IKU per Provinsi dari dataset processed.",
    "Modul Visualisasi Tab 2",
  ),
};
