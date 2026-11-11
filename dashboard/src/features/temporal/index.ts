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
};
