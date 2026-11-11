import { mountUnavailable } from '../../shared/unavailable-feature';
import type { Feature } from '../../data/types';

export const compliance: Feature = {
  id: 'compliance', title: 'Kepatuhan Regulasi', icon: 'shield',
  question: 'Bagaimana membandingkan pengamatan yang layak dengan acuan kualitas udara?',
  mount: host => mountUnavailable(host, 'Evaluasi kepatuhan kualitas udara', 'Analisis ini memerlukan validasi unit, periode perataan, ambang acuan, dan kelengkapan pengamatan sebelum perbandingan kepatuhan dapat ditampilkan.'),
};
