import { mountUnavailable } from '../../shared/unavailable-feature';
import type { Feature } from '../../data/types';

export const drivers: Feature = {
  id: 'drivers', title: 'Faktor Pemicu', icon: 'wind',
  question: 'Bagaimana cuaca dan karakteristik lokasi berkaitan dengan konsentrasi polutan?',
  mount: host => mountUnavailable(host, 'Cuaca dan karakteristik lokasi', 'Hubungan dengan suhu, kelembapan, angin, jarak ke jalan, dan karakteristik lalu lintas perlu dihitung dari data yang tersedia. Nilai lalu lintas pada master lokasi bukan deret pengamatan lalu lintas per jam.'),
};
