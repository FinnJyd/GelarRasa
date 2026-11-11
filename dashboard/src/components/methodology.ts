import type { DashboardData } from '../data/types';
import { button, element } from '../shared/dom';
import { number, period } from '../shared/format';
import { icon } from '../shared/icons';

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
    section('Rata-rata dan cakupan data', 'Rata-rata pilihan adalah rata-rata sederhana dari konsentrasi rata-rata tiap stasiun dalam ekspor, dengan bobot sama per stasiun. Rata-rata data VALID juga memberi bobot sama per stasiun dan membandingkan baris VALID dengan baris yang terekam; ini bukan kelengkapan terhadap semua jam yang diharapkan.');
    section('Hari di atas acuan 24 jam', 'Pada cakupan penuh, indikator menggunakan persentase seluruh hari-stasiun di atas ambang 24 jam yang tersimpan pada ekspor. Pada pilihan stasiun, indikator menghitung rata-rata sederhana persentase masing-masing stasiun karena jumlah hari valid per stasiun tidak tersedia pada ekspor. Penyebut kedua ringkasan berbeda; ini bukan audit kepatuhan tervalidasi.');
    section('Klasifikasi harian', 'Distribusi menghitung stasiun berdasarkan kategori harian yang paling sering muncul di ekspor. Ini bukan proporsi hari atau penduduk. Definisi kategori, batas konsentrasi, dan aturan seri perlu diverifikasi sebelum digunakan sebagai kesimpulan kepatuhan regulasi.');
    section('Batasan normalisasi dan agregasi', 'Tiga berkas AQMS memiliki header logger ppm. Metadata belum menjelaskan faktor konversinya; normalisasi pada pipeline lama belum tervalidasi. Agregasi harian lama mengambil rata-rata jam VALID tanpa menerapkan syarat minimum 18 jam. Karena itu, hasil ekspor bersifat sementara dan tidak membuktikan kepatuhan terhadap standar.');
    section('Indikator rumah sakit', 'Indikator ekspor membagi rata-rata harian admisi pernapasan balita dan lansia dengan total kapasitas tempat tidur yang dilaporkan. Nilai ini bukan tingkat keterisian tempat tidur atau dampak kausal polusi. Indikator tetap mencakup seluruh rumah sakit dan tidak mengikuti filter stasiun.');
    if (current) section('Cakupan kesehatan pada ekspor', `${number(current.hospital.hospitals)} rumah sakit anonim, ${number(current.hospital.days)} tanggal tercatat, dan ${number(current.hospital.beds)} tempat tidur yang dilaporkan. Pipeline lama mengisi nilai kesehatan atau kapasitas yang hilang dengan nol; dampaknya belum diaudit.`);
    section('Kontrol yang tersedia', 'Wilayah, tipe lokasi, dan stasiun memperbarui seluruh ringkasan stasiun, distribusi, tabel, dan peta. Ekspor belum mendukung perubahan tanggal, polutan lain, atau penambahan SUSPECT; kontrol tersebut dinonaktifkan.');
    section('Dampak Kesehatan', 'Tab kesehatan memakai ekspor terpisah dari scripts/export-health.py: seluruh indikator kesehatan mentah dipertahankan, relasi faskes dicek melalui provinsi dan kecamatan, dan tanggal kalender menjadi kunci. Paparan memakai minimal 18 jam berbeda per polutan dengan nilai numerik terbatas dan tidak negatif; duplikasi timestamp dikeluarkan. Header ppm tanpa konversi terverifikasi tidak masuk analisis pasangan. Filter polutan/QC hanya mengubah paparan. Lag 0–7 menghitung Pearson per faskes dengan ≥30 pasangan dan variasi kedua deret, lalu rata-rata berbobot sama. Kelompok konsentrasi menunjukkan rerata kasus faskes-hari pada lima interval sama lebar. Hasil eksploratif belum disesuaikan terhadap cuaca atau musim. Kolom pernapasan umum dan kelompok usia dipakai terpisah karena total dan subkelompok tidak selalu konsisten. Jumlah kasus tidak mengukur kerentanan tanpa penyebut populasi. Beban admisi pernapasan membandingkan rata-rata admisi umum harian dengan kapasitas, per 100 tempat tidur, bukan keterisian.');
    section('Jejak perhitungan', 'Sumber: dataset/raw/. Pipeline saat ini: notebooks/etl_tab1_ikhtisar.ipynb. Ringkasan: dataset/dashboard/tab1_ikhtisar.json, disalin ke dashboard/tab1_ikhtisar.json. Dimensi stasiun: scripts/export-station-catalog.py. Tidak ada data observasi pengganti ketika pemuatan gagal.');
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
