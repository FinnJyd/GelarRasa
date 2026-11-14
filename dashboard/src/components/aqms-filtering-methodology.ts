import { element } from '../shared/dom';

const STEPS: readonly (readonly [string, string])[] = [
  ['1. Resolusi Sumber & Satuan', 'Hubungkan rekaman AQMS ke sensor dan stasiun melalui tabel master dan metadata. Hanya kolom dan satuan yang didukung yang diolah ke µg/m³. Pada BJB-01, MDN-01, dan PSW-01, partikulat berlabel ppm dinormalisasi sebagai mg/m³ (×1.000); gas berlabel ppmv dikonversi menggunakan massa molekul/24,45 × 1.000 pada kondisi 25°C dan 1 atm.'],
  ['2. Penyaringan Status Kualitas (QC)', 'Secara bawaan hanya data VALID yang diterima. Opsi SUSPECT hanya disertakan jika filter kualitas eksplisit diaktifkan (VALID + SUSPECT); seluruh flag kualitas lainnya dikeluarkan.'],
  ['3. Pemeriksaan Waktu & Integritas Nilai', 'Seluruh rekaman dengan timestamp_start ganda pada stasiun yang sama dikeluarkan. Nilai harus berupa angka terhingga (bukan NaN/inf), non-negatif, dan berada dalam rentang kalender ekspor. Nilai nol riil instrumen dipertahankan; nilai tinggi tidak otomatis dibuang tanpa bukti anomali sensor.'],
  ['4. Agregasi Bertingkat (Jam lalu Hari)', 'Rekaman valid dalam jam lokal yang sama dirata-ratakan terlebih dahulu, kemudian setiap rata-rata jam diberi bobot setara. Rata-rata harian memerlukan minimal 18 jam berbeda dari 24 jam kalender; hari yang tidak memenuhi batas kelengkapan menghasilkan status tidak tersedia (null).'],
  ['5. Penentuan Hari Pembanding Pelampauan', 'PM2.5, PM10, SO2, dan NO2 dievaluasi terhadap rata-rata 24 jam. CO dan O3 dievaluasi terhadap nilai maksimum 8 jam harian (17 jendela harian, min. 13 jendela lengkap, tanpa jendela lintas tengah malam). Rata-rata 24 jam tidak menggantikan jendela 8 jam.'],
  ['6. Konsistensi Penyebut Kepatuhan', 'Hari terukur menghitung hari dengan ketersediaan rata-rata 24 jam; hari pembanding menghitung hari dengan pengukuran sesuai periode acuan regulasi. Persentase pelampauan dihitung dari hari pelampauan dibagi hari pembanding. Tanpa hari pembanding, status dilaporkan tidak tersedia (bukan 0%).'],
  ['7. Evaluasi Kelengkapan Tahunan', 'Rata-rata tahunan dihitung dari hari terukur yang tersedia. Kepatuhan regulasi mensyaratkan kelengkapan observasi ≥75% hari kalender dalam setahun; stasiun di bawah 75% diklasifikasikan sebagai data parsial dan dikeluarkan dari perankingan utama kecuali opsi penyertaan parsial diaktifkan.'],
];

export function aqmsFilteringMethodology(): HTMLElement {
  const section = element('section', 'method-section aqms-filtering-methodology');
  const header = element('div', 'method-section-header');
  header.append(element('span', 'method-badge', 'PROTOKOL TEKNIS'), element('h3', '', 'Alur Penyaringan Bertingkat AQMS (Tab 2–4)'));
  section.append(
    header,
    element('p', 'method-intro', 'Standar penyaringan AQMS menerapkan agregasi bertahap untuk memastikan kepatuhan regulasi dan konsistensi lintas tab tanpa imputasi:'),
  );
  const steps = element('ol');
  for (const [title, description] of STEPS) {
    const item = element('li');
    item.append(element('strong', '', title), element('p', '', description));
    steps.append(item);
  }
  section.append(
    steps,
    element('p', 'muted', 'Data mentah tidak pernah diubah atau dihapus dari sumber asli. Hari atau jam yang gagal memenuhi syarat menghasilkan nilai null tanpa rekayasa imputasi. Opsi Sertakan data parsial hanya menampilkan titik observasi riil dengan cakupan hari transparan.'),
  );
  return section;
}
