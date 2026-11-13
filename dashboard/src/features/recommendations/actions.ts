import { number, shortCity } from '../../shared/format';
import type { PolicyAction, PolicySummary, StationEvidence } from './types';

const locations = (rows: readonly StationEvidence[]): string => rows.map(row => `${shortCity(row.station.city)} (${row.station.code})`).join(' · ');
export function recommendActions(summary: PolicySummary): PolicyAction[] {
  const actions: PolicyAction[] = [];
  const defective = summary.rows.filter(row => row.station.status === 'Defective');
  if (defective.length) actions.push({ id: 'instrument', title: 'Periksa instrumen dan telemetri', locations: locations(defective),
    evidence: defective.map(row => `${row.station.code}: status master Defective; ${number(row.valid)} dari ${number(summary.dates.length)} hari memenuhi syarat ${summary.exposureLabel}.`).join(' '),
    step: 'Periksa log alat dan komunikasi untuk menetapkan penyebab sebelum memilih perbaikan atau penggantian.',
    followUp: 'Pantau jumlah hari yang kembali memenuhi syarat setelah pemeriksaan.' });
  const intermittent = summary.rows.filter(row => row.station.status === 'Intermittent');
  if (intermittent.length) actions.push({ id: 'continuity', title: 'Tinjau kesinambungan pemantauan', locations: locations(intermittent),
    evidence: intermittent.map(row => `${row.station.code}: ${number(row.valid)}/${number(summary.dates.length)} hari ${summary.exposureLabel}; status master Intermittent.`).join(' '),
    step: 'Telusuri jeda pencatatan dan hasil QC, lalu tentukan penanganan sesuai penyebab. Satuan yang belum terverifikasi diperiksa terpisah.',
    followUp: 'Catat hari lengkap dan lama jeda pencatatan pada evaluasi berikutnya.' });
  const units = summary.rows.filter(row => row.station.unavailable.length > 0);
  if (units.length) actions.push({ id: 'units', title: 'Verifikasi satuan logger', locations: locations(units),
    evidence: 'Header ppm pada berkas logger belum memiliki aturan konversi yang terverifikasi dalam metadata; konsentrasi belum dapat dibandingkan antarstasiun.',
    step: 'Cocokkan konfigurasi logger dengan catatan alat dan dokumentasikan aturan normalisasi yang teruji.',
    followUp: 'Pastikan satuan dan aturan konversi tercatat sebelum memasukkan hasil ke perbandingan konsentrasi.' });
  const health = summary.rows.filter(row => row.meanLoad !== null).sort((a, b) => (b.meanLoad ?? 0) - (a.meanLoad ?? 0) || a.station.code.localeCompare(b.station.code))[0];
  if (health && health.meanLoad !== null) actions.push({ id: 'service', title: 'Tinjau kesiapan layanan pernapasan', locations: `${health.station.hospital} · ${shortCity(health.station.city)}`,
    evidence: `Rata-rata ${number(health.meanLoad)} admisi pernapasan umum per 100 tempat tidur per hari, tertinggi di wilayah pilihan. Kapasitas tercatat ${health.station.beds === null ? 'tidak tersedia' : number(health.station.beds)} tempat tidur.`,
    step: 'Tinjau alur pasien dan kumpulkan data keterisian, lama rawat, serta tenaga layanan sebelum menetapkan tambahan kapasitas.',
    followUp: 'Evaluasi volume admisi bersama keterisian dan waktu layanan. Rasio admisi ini tidak mengukur okupansi atau kebutuhan tempat tidur.' });
  const isolated = [...summary.rows].sort((a, b) => b.station.nearest.km - a.station.nearest.km || a.station.code.localeCompare(b.station.code)).slice(0, 2);
  if (isolated.length) actions.push({ id: 'network', title: 'Lakukan studi lokasi pemantauan tambahan', locations: locations(isolated),
    evidence: isolated.map(row => `${row.station.code}: stasiun terdekat ${row.station.nearest.code}, ${number(row.station.nearest.km)} km.`).join(' ') + ' Lokasi dengan jarak terjauh dalam pilihan ditampilkan; jarak dihitung terhadap seluruh jaringan.',
    step: 'Tinjau kebutuhan pemantauan dan kandidat lokasi melalui survei sebelum menetapkan titik atau pengadaan alat.',
    followUp: 'Dokumentasikan kandidat terverifikasi dan kebutuhan yang dilayani. Jarak antarstasiun bukan radius cakupan penduduk.' });
  return actions;
}
