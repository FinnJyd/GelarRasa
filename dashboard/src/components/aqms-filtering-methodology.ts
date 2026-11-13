import { element } from '../shared/dom';

const STEPS: readonly (readonly [string, string])[] = [
  ['Sumber dan satuan', 'Hubungkan rekaman AQMS ke sensor dan stasiun melalui tabel master serta metadata. Hanya kolom dan satuan yang didukung yang diolah ke µg/m³. Pada BJB-01, MDN-01 dan PSW-01, partikulat berlabel ppm diasumsikan mg/m³ (×1.000); gas diasumsikan ppmv dan dikonversi dengan massa molekul/24,45 ×1.000 pada 25°C dan 1 atm. Ini asumsi analisis yang belum dikonfirmasi panitia, bukan konversi ppm universal atau penggunaan suhu cuaca per baris.'],
  ['Pilih kualitas rekaman (QC)', 'Secara bawaan hanya VALID yang diterima. SUSPECT ikut jika VALID + SUSPECT dipilih; semua flag lain dikeluarkan. Mengikutkan SUSPECT belum menjamin suatu hari memenuhi kelengkapan.'],
  ['Periksa waktu dan nilai per polutan', 'Semua rekaman dengan timestamp awal yang sama dalam sumber stasiun dikeluarkan. Timestamp dan angka harus terbaca, tanggal berada dalam kalender ekspor, serta konsentrasi bukan NaN/infinity dan tidak negatif. Nol yang benar-benar terukur tetap sah. Nilai tinggi tidak otomatis dibuang; kelayakan diperiksa per polutan.'],
  ['Rata-ratakan per jam, lalu per hari', 'Gunakan tanggal dan jam lokal yang tercatat. Rekaman lolos dalam jam yang sama dirata-ratakan terlebih dahulu, kemudian setiap rata-rata jam diberi bobot sama. Rata-rata harian memerlukan minimal 18 jam berbeda dari 24 jam; 18 rekaman pada sedikit jam belum cukup. Hari yang gagal tidak menghasilkan nilai harian.'],
  ['Tentukan hari pembanding pelampauan', 'PM2.5, PM10, SO2 dan NO2 memakai rata-rata 24 jam. CO/O3 memakai maksimum rata-rata 8 jam: ada 17 jendela dalam hari (00–08 hingga 16–24), masing-masing harus memiliki delapan jam lengkap dan minimal 13 jendela harus tersedia. Tidak ada jendela lintas tengah malam. Rata-rata 24 jam tidak menggantikan maksimum 8 jam yang tidak tersedia.'],
  ['Gunakan penyebut yang sesuai', 'Hari terukur menghitung hari dengan rata-rata 24 jam; hari pembanding menghitung hari dengan pengukuran sesuai periode acuan. Persentase pelampauan = hari di atas acuan ÷ hari pembanding ×100%, sehingga penyebut CO/O3 bisa berbeda dari hari terukur. Tanpa hari pembanding, hasil tidak tersedia, bukan 0%.'],
  ['Periksa cakupan tahunan', 'Rata-rata tahunan memakai rata-rata harian yang tersedia dalam tahun terpilih. Cakupan = hari terukur ÷ seluruh 365/366 hari kalender ×100%. Data disebut parsial jika kalender ekspor belum mencapai 31 Desember atau cakupan <75%; tanpa hari terukur, hasil tidak tersedia. Batas 75% tahunan adalah aturan kelengkapan analisis, bukan jaminan kepatuhan hukum. CO tidak dievaluasi terhadap acuan tahunan PP karena acuannya tidak tersedia.'],
];

export function aqmsFilteringMethodology(): HTMLElement {
  const section = element('section', 'method-section aqms-filtering-methodology');
  section.append(element('h3', '', 'Alur penyaringan AQMS (Tab 2–4)'), element('p', '', 'Tab 2 memakai agregat harian; Tab 3–4 menggunakan ekspor jam dari pemeriksaan nilai dan normalisasi yang sama. Syarat kelengkapan harian berlaku pada tren dan pelampauan Tab 3, bukan pada profil/pasangan per jam. Evaluasi tahunan hanya berlaku di Tab 2. Ekspor Tab 1 yang lebih lama masih memiliki perbedaan agregasi, sebagaimana dijelaskan pada batasan metodologi; alur ini tidak diterapkan pada rekaman kasus rumah sakit.'));
  const steps = element('ol');
  for (const [title, description] of STEPS) {
    const item = element('li');
    item.append(element('strong', '', title), element('p', '', description));
    steps.append(item);
  }
  section.append(steps, element('p', '', 'Data tidak dihapus dari sumber mentah. Rekaman yang ditolak atau hari yang tidak lengkap menghasilkan nilai tidak tersedia (null), tanpa imputasi. Opsi Sertakan data parsial awalnya nonaktif; saat diaktifkan, hanya titik tahunan parsial yang ikut ditampilkan dengan warna netral dan cakupan hari. Opsi ini tidak meloloskan kembali rekaman buruk atau mengisi hari kosong. Tabel lengkap tetap mempertahankan stasiun tanpa data.'));
  return section;
}
