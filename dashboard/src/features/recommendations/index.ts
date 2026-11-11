import { mountUnavailable } from '../../shared/unavailable-feature';
import type { Feature } from '../../data/types';

export const recommendations: Feature = {
  id: 'recommendations', title: 'Rekomendasi Kebijakan', icon: 'spark',
  question: 'Prioritas tindakan apa yang dapat didukung oleh hasil analisis?',
  mount: host => mountUnavailable(host, 'Prioritas tindakan berbasis bukti', 'Rekomendasi akan mengacu pada hasil yang telah diverifikasi dan keterbatasan jaringan pemantauan. Estimasi biaya-manfaat, dampak intervensi, dan simulasi tidak ditampilkan tanpa data serta metode yang mendukung.'),
};
