import type { DashboardData } from '../data/types';
import { button, element } from '../shared/dom';
import { number, period } from '../shared/format';
import { icon } from '../shared/icons';
import { aqmsFilteringMethodology } from './aqms-filtering-methodology';

export function createMethodology(data: () => DashboardData | null): {
  open: (invoker: HTMLElement) => void;
  destroy: () => void;
} {
  const controller = new AbortController();
  const dialog = element('dialog', 'methodology-dialog');
  dialog.setAttribute('aria-labelledby', 'methodology-title');
  const header = element('header', 'dialog-header');
  const heading = element('div');
  const title = element('h2', '', 'Metodologi & Integritas Data');
  title.id = 'methodology-title';
  heading.append(element('p', 'eyebrow', 'TRANSPARANSI ANALISIS'), title);
  const close = button('', 'icon-button');
  close.setAttribute('aria-label', 'Tutup metodologi');
  close.append(icon('close'));
  header.append(heading, close);
  const content = element('div', 'dialog-content');
  const footer = element('footer', 'dialog-footer');
  footer.append(element('span', 'muted', 'PRANA · Dataset sintetis'), button('Tutup', 'button close-dialog'));
  dialog.append(header, content, footer);
  document.body.append(dialog);
  let invoker: HTMLElement | null = null;

  const section = (titleText: string, bodyText: string): void => {
    const section = element('section', 'method-section');
    section.append(element('h3', '', titleText), element('p', '', bodyText));
    content.append(section);
  };

  function refresh(): void {
    content.replaceChildren();
    const current = data();
    section('Sumber dan cakupan', 'Dataset sintetis: telemetri AQMS, data kesehatan harian anonim, tabel master, dan metadata. Hasil menggambarkan lokasi yang dipantau, bukan estimasi paparan seluruh penduduk Indonesia.');
    if (current) section('Periode pengamatan', `${period(current.start, current.end)} (WIB), ${number(current.stations.length)} stasiun dalam ekspor. Wilayah dan tipe lokasi diambil dari dataset/raw/master/sites.csv. Waktu pembuatan ekspor bukan waktu pengamatan terakhir.`);
    section('Rata-rata dan cakupan data', 'Tab 1 menghitung rata-rata periode dari hari terukur tiap stasiun, lalu memberi bobot sama pada stasiun yang memiliki data. Hari kosong dilewati; stasiun tanpa hari terukur tetap ada di peta dan tabel dengan status Data tidak mencukupi serta dikeluarkan dari indikator udara dan donat. Angka nol yang benar-benar terukur tetap dipakai. Cakupan ditampilkan sebagai jumlah hari terukur dibagi tanggal dalam rentang pilihan, bukan persentase baris QC atau kelengkapan jam. Stasiun dengan sedikit hari tetap dihitung dari data yang tersedia; perhatikan cakupannya.');
    section('Hari di atas acuan 24 jam', 'Untuk setiap stasiun terukur, jumlah hari di atas acuan dibagi hari terukur pada polutan dan QC terpilih. Indikator Tab 1 merupakan rata-rata sederhana persentase stasiun terukur, termasuk pada cakupan penuh; bukan persentase gabungan berbobot hari-stasiun atau audit kepatuhan hukum. Tanpa hari terukur, hasil tidak tersedia dan tidak diganti nol maupun angka ringkasan lama.');
    section('Klasifikasi harian', 'Donat menghitung kategori yang paling sering muncul pada hari terukur masing-masing stasiun; penyebutnya hanya stasiun terukur. Stasiun tanpa data tidak diberi kategori Baik. Peta tetap menampilkan seluruh lokasi terpilih dan memberi penanda abu-abu bergaris putus-putus untuk Data tidak mencukupi; persentase legenda peta memakai seluruh stasiun pilihan, termasuk yang tidak memiliki data. Ini bukan proporsi hari atau penduduk.');
    section('Batasan normalisasi dan agregasi', 'PM2.5/PM10 berlabel ppm pada BJB-01, MDN-01, dan PSW-01 diasumsikan sebagai skala massa logger mg/m³ dan dikalikan 1.000 ke µg/m³. Ini asumsi normalisasi yang disetujui berdasarkan pilihan satuan alat, bukan konversi ppm terverifikasi. Gas berlabel ppm pada tiga logger yang sama diasumsikan ppmv, dikonversi ke ug/m3 dengan massa molekul/24,45 * 1.000 pada asumsi 25 C dan 1 atm, belum dikonfirmasi panitia. Ekspor Tab 1 saat ini mensyaratkan minimal 18 baris berstatus QC sesuai pilihan per stasiun-hari sebelum merata-ratakan nilai polutan yang tersedia. Ini belum menjamin 18 jam unik atau 18 nilai tiap polutan, dan berbeda dari pipeline Tab 2/5. Karena itu, hasil ekspor bersifat sementara dan tidak membuktikan kepatuhan terhadap standar.');
    section('Indikator rumah sakit', 'Indikator ekspor membagi rata-rata harian admisi pernapasan balita dan lansia dengan total kapasitas tempat tidur yang dilaporkan. Nilai ini bukan tingkat keterisian tempat tidur atau dampak kausal polusi. Indikator tetap mencakup seluruh rumah sakit dan tidak mengikuti filter stasiun.');
    if (current) section('Cakupan kesehatan pada ekspor', `${number(current.hospital.hospitals)} rumah sakit anonim, ${number(current.hospital.days)} tanggal tercatat, dan ${number(current.hospital.beds)} tempat tidur yang dilaporkan. Pipeline lama mengisi nilai kesehatan atau kapasitas yang hilang dengan nol; dampaknya belum diaudit.`);
    section('Kontrol yang tersedia', 'Wilayah, tipe lokasi, dan stasiun memperbarui seluruh ringkasan stasiun, distribusi, tabel, dan peta. Tanggal, enam polutan dan pilihan VALID/VALID + SUSPECT memperbarui deret harian Tab 1. Cakupan stasiun dan hari terukur selalu mengikuti pilihan.');
    section('Dampak Kesehatan', 'Tab kesehatan memakai ekspor terpisah dari scripts/export-health.py: seluruh indikator kesehatan mentah dipertahankan, relasi faskes dicek melalui provinsi dan kecamatan, dan tanggal kalender menjadi kunci. Paparan memakai minimal 18 jam berbeda per polutan dengan nilai numerik terbatas dan tidak negatif; duplikasi timestamp dikeluarkan. PM2.5/PM10 logger pada tiga stasiun memakai asumsi skala massa ×1.000 yang sama; gas ppmv memakai massa molekul/24,45 * 1.000 pada asumsi 25 C dan 1 atm, sehingga masuk analisis jika kelengkapannya cukup. Filter polutan/QC hanya mengubah paparan. Lag 0–7 menghitung Pearson per faskes dengan ≥30 pasangan dan variasi kedua deret, lalu rata-rata berbobot sama. Kelompok konsentrasi menunjukkan rerata kasus faskes-hari pada lima interval sama lebar. Hasil eksploratif belum disesuaikan terhadap cuaca atau musim. Kolom pernapasan umum dan kelompok usia dipakai terpisah karena total dan subkelompok tidak selalu konsisten. Jumlah kasus tidak mengukur kerentanan tanpa penyebut populasi. Beban admisi pernapasan membandingkan rata-rata admisi umum harian dengan kapasitas, per 100 tempat tidur, bukan keterisian.');
    section('Perubahan admisi balita dan lansia', 'Tab 5 membandingkan admisi pernapasan balita <5 dan lansia >60 terhadap rata-rata periode masing-masing umur di faskes yang sama. Baseline memakai seluruh tanggal terpilih dengan kedua jumlah umur tersedia, termasuk tanggal tanpa paparan AQMS. Hari dengan paparan dan kedua umur tersedia dikelompokkan menurut tingkat paparan relatif tiap faskes: P1 hingga P5, memakai batas urutan kumulatif 20%, 40%, 60% dan 80%. Nilai paparan sama tidak dipisah secara sembarang; jumlah hari tiap kelompok bisa berbeda. Faskes harus memiliki ≥30 hari berpasangan, kelima kelompok terisi dan kedua baseline >0; ini syarat analisis deskriptif, bukan tambahan aturan QC. Gunakan faskes yang sama di kelima kelompok. Pada tiap faskes/umur, perubahan = (rata-rata admisi kelompok paparan ÷ baseline periode − 1) ×100%, lalu rata-ratakan perubahan dengan bobot sama antar-faskes. Tooltip menunjukkan faskes-hari dan rata-rata paparan aktual; ringkasan menunjukkan cakupan dan baseline. Filter polutan, QC, tanggal serta dimensi stasiun berlaku; pemilih jenis penyakit tidak mengubah perbandingan dua umur ini. Tanpa kecukupan, hasil tidak tersedia; tidak ada imputasi. Hasil tidak disesuaikan cuaca, musim, ukuran populasi atau lag dan bukan risiko relatif maupun bukti kelompok paling rentan.');
    section('Filter utama Pola Waktu dan Faktor Pemicu', 'Filter global wilayah, stasiun, tipe lokasi, tanggal, polutan dan QC mengendalikan seluruh grafik dan KPI Tab 3–4. Ekspor per jam dihasilkan scripts/export-hourly.py dengan eligible_values dari scripts/export-compliance.py dan normalisasi yang disetujui. Data dimuat per stasiun/QC dan dihitung di worker; tidak ada imputasi. Pola per jam menggabungkan jam-stasiun tersedia, bukan rata-rata berbobot sama antarstasiun. Profil membutuhkan 10 pengamatan per sel; matriks hari-jam membutuhkan 5. Tren harian membutuhkan 18 jam berbeda; episode CO/O3 memakai maksimum 8 jam lengkap dengan minimal 13 dari 17 jendela. Satu hari terukur di bawah acuan boleh menjadi jeda episode; hari hilang memutus episode. Pemotongan tanggal dapat memotong episode di batas periode.');
    section('Hubungan cuaca pada cakupan pilihan', 'Tab 4 memakai polutan yang dipilih pada semua grafik. Mawar menampilkan maksimal tiga contoh stasiun dalam pilihan (minimal 3 pasangan per sektor, angin ≥0,5 m/s); kelompok kecepatan angin membutuhkan 5 pasangan. Korelasi Spearman menggabungkan pasangan jam seluruh stasiun pilihan, membutuhkan 30 pasangan dan variasi nilai; korelasi gabungan dapat mencerminkan perbedaan antarstasiun. Cuaca memerlukan angka finite dan QC/waktu/duplikasi yang sama; tidak ada ambang pencilan cuaca baru. Arah angin dijumlahkan secara sirkular. P95 konsentrasi dihitung ulang dari jam-stasiun pilihan, bukan acuan hukum. Intensitas lalu lintas berasal dari atribut master stasiun, bukan pengamatan lalu lintas harian. Hasil deskriptif ini bukan bukti sebab-akibat. Ekspor berada di dataset/dashboard/hourly dan dashboard/data/hourly; manifest menyimpan hash sumber dan shard.');
    content.append(aqmsFilteringMethodology());
    section('Jejak perhitungan', 'Sumber: dataset/raw/. Pipeline Tab 1: notebooks/etl_tab1_ikhtisar.ipynb; ringkasan: dataset/dashboard/tab1_ikhtisar.json, disalin ke dashboard/tab1_ikhtisar.json. Pipeline Tab 2: scripts/export-compliance.py dan scripts/unit_normalization.py; hasil: dataset/dashboard/compliance_daily.json, disalin ke dashboard/data/compliance_daily.json. Simulasi dengan output tersimpan: notebooks/simulasi_penyaringan_tab2.ipynb. Dimensi stasiun: scripts/export-station-catalog.py. Tidak ada data observasi pengganti ketika pemuatan gagal.');
  }

  function dismiss(): void { dialog.close(); }
  close.addEventListener('click', dismiss, { signal: controller.signal });
  footer.querySelector('button')?.addEventListener('click', dismiss, { signal: controller.signal });
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dismiss();
  }, { signal: controller.signal });
  dialog.addEventListener('close', () => invoker?.focus(), { signal: controller.signal });
  dialog.addEventListener('keydown', event => {
    if (event.key !== 'Tab') return;
    const focusable = [...dialog.querySelectorAll<HTMLElement>('button, a[href], input, select, [tabindex="0"]')].filter(node => !node.hasAttribute('disabled'));
    const first = focusable[0];
    const last = focusable.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  }, { signal: controller.signal });
  return {
    open: target => { invoker = target; refresh(); dialog.showModal(); close.focus(); },
    destroy: () => { controller.abort(); dialog.close(); dialog.remove(); },
  };
}
