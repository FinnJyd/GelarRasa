import { mountUnavailable } from '../../shared/unavailable-feature';
import type { Feature } from '../../data/types';

export const health: Feature = {
  id: 'health', title: 'Dampak Kesehatan', icon: 'heart',
  question: 'Bagaimana paparan dan admisi kesehatan berhubungan pada kelompok rentan?',
  mount: host => mountUnavailable(host, 'Hubungan paparan dan kesehatan', 'Analisis jeda paparan memerlukan penyelarasan waktu dan hubungan stasiun–rumah sakit yang terdokumentasi. Identitas rumah sakit tetap anonim; asosiasi tidak diperlakukan sebagai bukti sebab akibat.'),
};
