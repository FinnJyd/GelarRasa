import { mountUnavailable } from '../../shared/unavailable-feature';
import type { Feature } from '../../data/types';

export const temporal: Feature = {
  id: 'temporal', title: 'Pola Waktu', icon: 'clock',
  question: 'Bagaimana konsentrasi berubah menurut jam, hari, dan musim?',
  mount: host => mountUnavailable(host, 'Perubahan kualitas udara dari waktu ke waktu', 'Profil per jam, perbandingan hari kerja, dan tren musiman memerlukan ekspor temporal dengan cakupan yang sebanding. Ringkasan stasiun saat ini belum mendukung analisis tersebut.'),
};
