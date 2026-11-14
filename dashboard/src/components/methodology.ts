import type { DashboardData } from '../data/types';
import { button, element } from '../shared/dom';
import { number, period } from '../shared/format';
import { icon } from '../shared/icons';
import { aqmsFilteringMethodology } from './aqms-filtering-methodology';

interface DecisionItem {
  readonly label: string;
  readonly text: string;
}

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
  heading.append(element('p', 'eyebrow', 'TRANSPARANSI KEPUTUSAN ANALITIS'), title);
  const close = button('', 'icon-button');
  close.setAttribute('aria-label', 'Tutup metodologi');
  close.append(icon('close'));
  header.append(heading, close);
  const content = element('div', 'dialog-content');
  const footer = element('footer', 'dialog-footer');
  footer.append(element('span', 'muted', 'PRANA · Metodologi & Transparansi Regulasi'), button('Tutup', 'button close-dialog'));
  dialog.append(header, content, footer);
  document.body.append(dialog);
  let invoker: HTMLElement | null = null;

  function renderMetaCard(current: DashboardData | null): HTMLElement {
    const card = element('div', 'method-meta-card');
    const addItem = (label: string, value: string): void => {
      const item = element('div', 'method-meta-item');
      item.append(element('div', 'meta-label', label), element('div', 'meta-value', value));
      card.append(item);
    };

    addItem('Sumber Data', 'Telemetri AQMS, admisi RS harian anonim, master sites, dan metadata geografis (komite).');
    addItem(
      'Cakupan Observasi',
      current ? `${period(current.start, current.end)} (WIB) · ${number(current.stations.length)} stasiun telemetri` : '27 stasiun telemetri (2024–2026)',
    );
    addItem(
      'Fasilitas Kesehatan',
      current ? `${number(current.hospital.hospitals)} RS anonim (${number(current.hospital.beds)} tempat tidur, ${number(current.hospital.days)} tanggal)` : '4 RS anonim terdaftar',
    );
    addItem('Prinsip Analisis', 'Zero-Imputation (tanpa rekayasa data kosong), validitas harian ≥18 jam unik, dan evaluasi berbasis regulasi.');
    return card;
  }

  function renderPillar(
    badge: string,
    titleText: string,
    intro: string,
    decisions: readonly DecisionItem[],
  ): HTMLElement {
    const sec = element('section', 'method-section');
    const secHeader = element('div', 'method-section-header');
    secHeader.append(element('span', 'method-badge', badge), element('h3', '', titleText));
    sec.append(secHeader, element('p', 'method-intro', intro));
    const list = element('ul', 'method-list');
    for (const d of decisions) {
      const li = element('li');
      li.append(element('strong', '', `${d.label}: `), document.createTextNode(d.text));
      list.append(li);
    }
    sec.append(list);
    return sec;
  }

  function renderProvenance(): HTMLElement {
    const sec = element('section', 'method-section');
    const secHeader = element('div', 'method-section-header');
    secHeader.append(element('span', 'method-badge', 'PROVENANCE'), element('h3', '', 'Jejak Komputasi & Integritas Sumber Data'));
    sec.append(
      secHeader,
      element('p', 'method-intro', 'Seluruh data diolah secara deterministik dari direktori sumber tanpa estimasi tiruan saat pemuatan gagal:'),
    );
    const list = element('ul', 'method-list');
    const items: readonly DecisionItem[] = [
      {
        label: 'Sumber Primer Mentah',
        text: 'dataset/raw/ (master sites, metadata sensor, catatan telemetri stasiun AQMS, dan admisi harian rumah sakit).',
      },
      {
        label: 'Pipeline Analisis Terverifikasi',
        text: 'scripts/export-compliance.py (agregasi kepatuhan), scripts/export-hourly.py (data per jam & cuaca), scripts/export-health.py (korelasi lag kesehatan), dan scripts/export-policy.py (evaluasi ekspansi jaringan).',
      },
      {
        label: 'Penyelarasan Tab 1 & Tab 2',
        text: 'Penyajian Tab 1 diturunkan dari dataset/dashboard/tab1_ikhtisar.json dengan bobot stasiun setara pada hari terukur, selaras dengan prinsip penyaringan bertingkat Tab 2–4.',
      },
      {
        label: 'Kebijakan Kegagalan (Fail-Safe)',
        text: 'Jika berkas ekspor atau data stasiun tidak tersedia, sistem menampilkan status eksplisit "Data tidak mencukupi" / "Belum tersedia", tanpa pernah menyuntikkan nilai fallback atau angka estimasi sintetis.',
      },
    ];
    for (const item of items) {
      const li = element('li');
      li.append(element('strong', '', `${item.label}: `), document.createTextNode(item.text));
      list.append(li);
    }
    sec.append(list);
    return sec;
  }

  function refresh(): void {
    content.replaceChildren();
    const current = data();

    content.append(renderMetaCard(current));

    content.append(
      renderPillar(
        'PILAR 1',
        'Integritas Data, Kontrol Kualitas (QC) & Kebijakan Nol-Imputasi',
        'Keputusan penyaringan rekaman mentah untuk menjamin keaslian deret observasi:',
        [
          {
            label: 'Penyaringan Kualitas (QC) Bawaan',
            text: 'Secara bawaan sistem hanya meloloskan data berstatus VALID. Opsi SUSPECT hanya disertakan saat filter kualitas diaktifkan secara eksplisit (VALID + SUSPECT). Seluruh flag status lainnya ditolak permanen.',
          },
          {
            label: 'Deduplikasi Timestamp Awal',
            text: 'Seluruh rekaman dengan timestamp_start ganda pada stasiun yang sama ditolak (bukan hanya baris kedua), demi menjamin integritas kronologis sensor.',
          },
          {
            label: 'Ambang Kelengkapan Harian',
            text: 'Rata-rata harian memerlukan minimal 18 jam berbeda dari 24 jam kalender lokal (00:00–23:00). Penghitungan baris tanpa sebaran 18 jam unik tidak diterima.',
          },
          {
            label: 'Kebijakan Nol-Imputasi (Zero Imputation)',
            text: 'Hari atau jam yang tidak memenuhi syarat dilaporkan sebagai tidak tersedia (null). Tidak ada pengisian celah data dengan rata-rata, interpolasi, atau nilai nol tiruan. Nilai nol riil yang tercatat oleh instrumen tetap dipertahankan.',
          },
        ],
      ),
    );

    content.append(
      renderPillar(
        'PILAR 2',
        'Standarisasi Satuan & Kalibrasi Instrumen',
        'Harmonisasi skala instrumen lintas stasiun berdasarkan karakteristik fisik sensor:',
        [
          {
            label: 'Normalisasi Partikulat (PM2.5 & PM10)',
            text: 'Berdasarkan audit sensor dan pilihan logger, tiga stasiun (BJB-01, MDN-01, PSW-01) yang tercatat berlabel ppm diidentifikasi berskala massa mg/m³ dan dinormalisasi dengan faktor pengali ×1.000 ke satuan baku µg/m³.',
          },
          {
            label: 'Konversi Molekuler Gas Kriteria',
            text: 'Gas (SO2, NO2, CO, O3) berlabel ppmv dikonversi ke µg/m³ menggunakan berat molekul pada kondisi referensi standar (25°C, 1 atm): Konsentrasi = (Nilai × BM / 24,45) × 1.000.',
          },
          {
            label: 'Integritas Batas Nilai',
            text: 'Hanya angka numerik terhingga (bukan NaN/inf) dan konsentrasi ≥ 0 yang diterima. Konsentrasi tinggi tidak dibuang secara sepihak tanpa bukti fisik anomali sensor.',
          },
        ],
      ),
    );

    content.append(
      renderPillar(
        'PILAR 3',
        'Kepatuhan Regulasi & Baku Mutu (PP 22/2021 & ISPU)',
        'Penerapan standar acuan hukum lingkungan hidup dan indeks kualitas udara nasional:',
        [
          {
            label: 'Rata-rata Acuan 24 Jam',
            text: 'PM2.5 (55 µg/m³), PM10 (75 µg/m³), SO2 (75 µg/m³), dan NO2 (65 µg/m³) dievaluasi terhadap rata-rata 24 jam pada hari terukur valid.',
          },
          {
            label: 'Moving Average 8 Jam (CO & O3)',
            text: 'Sesuai regulasi, CO (4.000 µg/m³) dan O3 (100 µg/m³) dievaluasi dari nilai maksimum 17 jendela bergerak 8 jam harian (00:00–08:00 hingga 16:00–24:00), dengan syarat minimal 13 jendela lengkap per hari tanpa jendela lintas hari.',
          },
          {
            label: 'Evaluasi Kepatuhan Tahunan',
            text: 'Rata-rata tahunan dihitung dari hari terukur yang tersedia. Kepatuhan regulasi mensyaratkan kelengkapan data ≥75% hari kalender dalam setahun; stasiun <75% ditandai parsial dan tidak diklasifikasikan patuh hukum.',
          },
          {
            label: 'Indeks Kualitas Udara (IKU) Stasiun',
            text: 'Dihitung adaptif sesuai formula Permen LHK No. 27/2021 berbasis hari terukur berpasangan NO2 dan SO2 pada stasiun pemantau aktif.',
          },
        ],
      ),
    );

    content.append(
      renderPillar(
        'PILAR 4',
        'Dinamika Temporal & Dekomposisi Faktor Pemicu (Tab 3 & 4)',
        'Metode statistik pemisahan kontribusi lingkungan, cuaca, dan pola waktu:',
        [
          {
            label: 'Dekomposisi Varians Polusi',
            text: 'Kontribusi faktor lingkungan kategorik (arah angin, tipe zonasi) diukur dengan η² (Eta-squared ANOVA). Kontribusi variabel cuaca kontinu (kecepatan angin, suhu, kelembapan) diukur dengan koefisien determinasi R² regresi linier.',
          },
          {
            label: 'Ambang Ekstremitas Lokal (P90)',
            text: 'Hari dan jam polusi ekstrem ditetapkan menggunakan persentil ke-90 (P90) aktual dari deret observasi pada stasiun dan rentang tanggal terpilih.',
          },
          {
            label: 'Segmentasi Musim Karhutla',
            text: 'Periode kabut asap musiman diisolasi secara khusus pada bulan Agustus–Oktober untuk dibandingkan terhadap bulan dasar (November–Juli).',
          },
          {
            label: 'Ventilasi & Dispersi Angin',
            text: 'Pengelompokan kecepatan angin per 0,5 m/s dengan normalisasi median lokal per tipe zonasi untuk mengisolasi efek ventilasi udara terhadap akumulasi emisi.',
          },
        ],
      ),
    );

    content.append(
      renderPillar(
        'PILAR 5',
        'Analisis Dampak Kesehatan & Tekanan Fasilitas Rumah Sakit (Tab 5)',
        'Hubungan paparan polusi terhadap respons admisi faskes dan beban tempat tidur:',
        [
          {
            label: 'Korelasi Jeda Waktu (Lag Correlation)',
            text: 'Koefisien Pearson dihitung antara paparan polutan harian dan admisi kasus pada jeda waktu 0 hingga 7 hari (lag 0–7) per rumah sakit dengan syarat minimal 30 pasangan terukur.',
          },
          {
            label: 'Stratifikasi Respons Kuintil (P1–P5)',
            text: 'Pasangan paparan–kasus dibagi ke dalam 5 kuintil konsentrasi relatif terhadap rata-rata baseline faskes masing-masing untuk menunjukkan gradien risiko beban penyakit.',
          },
          {
            label: 'Metrik Tekanan Kapasitas Tempat Tidur',
            text: 'Rasio beban faskes didefinisikan sebagai (Admisi Pernapasan + Admisi CVD) / Total Kapasitas Tempat Tidur × 100 per hari, dievaluasi pada tanggal dengan pelaporan fasilitas lengkap.',
          },
          {
            label: 'Batas Interpretasi Klinis',
            text: 'Analisis bersifat ekologis dan deskriptif tanpa standarisasi demografi menyeluruh; data menggambarkan beban layanan faskes pemantau dan bukan penetapan kausalitas klinis langsung.',
          },
        ],
      ),
    );

    content.append(
      renderPillar(
        'PILAR 6',
        'Pemodelan Rekomendasi & Perencanaan Ekspansi Jaringan (Tab 6)',
        'Prioritisasi intervensi kebijakan berbasis multikriteria objektif dan simulasi kapasitas:',
        [
          {
            label: 'Indeks Prioritas Wilayah Baru',
            text: 'Mengintegrasikan 3 kriteria objektif dinormalisasi min-maks: Baseline Polusi PM2.5, Intensitas Lalu Lintas, dan Jarak ke Stasiun Terdekat, dengan pembobotan adaptif pengguna.',
          },
          {
            label: 'Radius Ilustrasi Spasial',
            text: 'Menggunakan formula jarak lingkaran besar (Haversine) dengan radius 10–300 km untuk mengeksplorasi jangkauan pengawasan dan area tanpa pemantauan (monitoring gaps).',
          },
          {
            label: 'Simulasi Beban Kapasitas Faskes',
            text: 'Menguji elastisitas beban rumah sakit terhadap skenario peningkatan admisi dan penambahan tempat tidur terencana secara deterministik.',
          },
        ],
      ),
    );

    content.append(aqmsFilteringMethodology());

    content.append(renderProvenance());
  }

  function dismiss(): void {
    dialog.close();
  }

  close.addEventListener('click', dismiss, { signal: controller.signal });
  footer.querySelector('button')?.addEventListener('click', dismiss, { signal: controller.signal });
  dialog.addEventListener(
    'click',
    event => {
      if (event.target !== dialog) return;
      const bounds = dialog.getBoundingClientRect();
      if (
        event.clientX < bounds.left ||
        event.clientX > bounds.right ||
        event.clientY < bounds.top ||
        event.clientY > bounds.bottom
      ) {
        dismiss();
      }
    },
    { signal: controller.signal },
  );
  dialog.addEventListener('close', () => invoker?.focus(), { signal: controller.signal });
  dialog.addEventListener(
    'keydown',
    event => {
      if (event.key !== 'Tab') return;
      const focusable = [
        ...dialog.querySelectorAll<HTMLElement>('button, a[href], input, select, [tabindex="0"]'),
      ].filter(node => !node.hasAttribute('disabled'));
      const first = focusable[0];
      const last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    },
    { signal: controller.signal },
  );

  return {
    open: target => {
      invoker = target;
      refresh();
      dialog.showModal();
      close.focus();
    },
    destroy: () => {
      controller.abort();
      dialog.close();
      dialog.remove();
    },
  };
}
