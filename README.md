# Dashboard Analysis — Gelar Rasa 2026
> **Tema:** *"From Roots to Clarity, Revealing Meaningful Insight Through Data"*

Repositori ini memuat seluruh alur kerja rekayasa data, eksplorasi data (EDA), pemodelan dampak lingkungan dan kesehatan, serta kode antarmuka web dashboard interaktif untuk perlombaan **Dashboard Analysis (DA) Gelar Rasa 2026**.

---

## 📁 Struktur Direktori Proyek

```
.
├── dataset/
│   ├── raw/                                # 🔒 Data mentah asli (diabaikan oleh Git)
│   │   ├── Dataset DA Gelar Rasa 2026.zip  # File arsip zip data mentah
│   │   ├── aqms/                           # 27 file CSV telemetri kualitas udara per jam
│   │   ├── health/                         # Data surveilans kesehatan harian rumah sakit (HLT-01)
│   │   ├── master/                         # sites.csv, sensors.csv, hospitals.csv
│   │   └── metadata/                       # metadata_dates.csv, metadata_sensors.csv
│   │
│   ├── processed/                          # ⚡ Data hasil pembersihan & agregasi harian (Python/EDA)
│   └── dashboard/                          # 🌐 File JSON ringkas (< 2MB) untuk visualisasi frontend
│
├── notebooks/                              # Jupyter Notebook analisis & pemrosesan data
│   └── download_data.ipynb                 # Notebook otomatis unduh data dari Google Drive
│
├── dashboard/                              # Kode aplikasi web frontend (HTML5/CSS3/JavaScript)
│   ├── index.html                          # Halaman utama dashboard
│   ├── css/                                # Lembar gaya (styling)
│   └── js/                                 # Logika interaktif & rendering grafik
│
├── .env.example                            # Template variabel lingkungan (aman dipush ke GitHub)
├── .env                                    # Konfigurasi privat / ID Google Drive (diabaikan Git)
├── .gitattributes                         # Normalisasi format akhir baris (line endings LF)
├── .gitignore                              # Konfigurasi proteksi & pengecualian file Git
├── Booklet Case Study DA Gelar Rasa 2026.pdf
├── HANDBOOK PRELIMINARY ROUND DA GELAR RASA 2026.pdf
└── README.md
```

---

## 🚀 Panduan Memulai (Getting Started)

### 1. Prasyarat Sistem
* **Python 3.10+**
* Pustaka Python utama: `pandas`, `numpy`, `scipy`, `python-dotenv`, `gdown`
* Peramban Web Modern (Google Chrome, Microsoft Edge, atau Mozilla Firefox)

### 2. Penyiapan Lingkungan & Unduh Dataset
Bagi anggota tim yang baru melakukan *clone* dari repositori ini, data mentah tidak disertakan di GitHub demi menjaga ukuran repositori tetap ringan. Ikuti langkah mudah berikut:

1. Salin berkas template lingkungan:
   ```bash
   cp .env.example .env
   ```
2. Buka berkas `.env` lalu masukkan Google Drive File ID yang telah dibagikan di grup tim:
   ```ini
   GDRIVE_FILE_ID=masukkan_id_file_drive_di_sini
   ```
3. Buka dan jalankan seluruh sel pada notebook [`notebooks/download_data.ipynb`](notebooks/download_data.ipynb). Notebook ini akan mengunduh berkas zip dan mengekstrak seluruh data mentah secara otomatis ke dalam `dataset/raw/`.

---

## 🔄 Alur Pemrosesan Data (Pipeline)

1. **Ingesti Data Mentah (`dataset/raw/`):** 
   Pembacaan 27 stasiun telemetri kualitas udara (~660.000 baris) dan 27 rumah sakit rujukan (~27.000 baris data kesehatan).
2. **Pembersihan & Agregasi (`dataset/processed/`):** 
   Penyaringan bendera kualitas (*QC flag*), perhitungan rata-rata harian 24 jam, penggabungan data polusi dengan admisi rumah sakit, serta analisis korelasi jeda waktu (*distributed lag effects*).
3. **Ekspor Data Visualisasi (`dataset/dashboard/`):** 
   Hasil pemodelan dan agregasi diekspor dalam format JSON berukuran sangat ringan (< 2 MB) agar dapat dibaca seketika oleh web browser.
4. **Penyajian Dashboard Interaktif (`dashboard/`):** 
   Visualisasi interaktif berbasis web (peta sebaran stasiun, kartu KPI nasional, tren kepatuhan ISPU/PP 22, dan sistem pemantauan lonjakan kapasitas tempat tidur rumah sakit).

---

## 📋 Checklist Pengumpulan Kompetisi

* [ ] **Tautan Dashboard:** Format penamaan `DA2026_Dashboard_NamaTim_NamaKetua` (Wajib menyertakan logo resmi Gelar Rasa).
* [ ] **Laporan Analisis:** Format berkas `DA2026_Laporan_NamaTim_NamaKetua.pdf` (Disusun sesuai template resmi).
* [ ] **Batas Pengumpulan:** 14 November 2026 pukul 23.59 WIB melalui tautan panitia: `bit.ly/PreliminarySubmissionDAGelarRasa2026`.


## Pengembangan antarmuka PRANA

Sumber antarmuka berada di `dashboard/entry.html`, `dashboard/src/` (TypeScript strict dan modul per fitur), serta `dashboard/styles.css` (Tailwind dan token desain). Ikhtisar Nasional menggunakan Chart.js untuk doughnut komposisi, serta Leaflet dengan Esri untuk peta. `dashboard/app.js` dan `dashboard/app.css` adalah hasil build, bukan berkas sumber untuk diedit langsung.

```bash
npm ci
bun run build
bun run dev
```

`bun run dev` menjalankan Vite dengan pembaruan otomatis. Buka URL yang dicetak terminal; `/` akan diarahkan ke `/dashboard`. Port awal 5500, lalu port berikutnya bila sudah dipakai. Biarkan server berjalan: perubahan TypeScript, HTML, dan ekspor JSON memperbarui halaman secara otomatis; perubahan Tailwind/CSS diterapkan langsung tanpa membuang pilihan aktif. Tidak perlu menjalankan build atau memulai ulang server untuk perubahan biasa. Gunakan port yang dicetak proses terbaru. Font, Chart.js, Leaflet, dan Tailwind dilayani lokal; peta dasar tetap membutuhkan internet.

`bun run build` menjalankan pemeriksaan tipe dan build produksi Vite, menghasilkan `dist/` sekaligus menyinkronkan ekspor statis di `dashboard/`. HTML entry, `app.js`, `app.css`, `dashboard/assets/`, dan `THIRD_PARTY_LICENSES.md` adalah hasil build; jangan diedit langsung. `bun run preview` menyajikan hasil produksi untuk verifikasi, tanpa live reload. Ekspor statis juga tetap dapat disajikan dari root repositori melalui server HTTP biasa. Tailwind menggunakan plugin resmi Vite dan `@apply`; Preflight tidak diaktifkan agar reset, ukuran kontrol, animasi, dan peta tetap mengikuti kontrak desain.

```bash
bun run typecheck
bun run test
bun run test:browser
```

Pengujian browser menggunakan Vite pada port 5511. Untuk memeriksa hasil produksi setelah build, jalankan `PRANA_TEST_MODE=production bun run test:browser`. Pasang Chromium melalui `npx playwright install chromium` atau tentukan browser lokal dengan `PRANA_BROWSER_PATH=/path/to/chromium bun run test:browser`.

Baca [design.md](design.md) dan [AGENTS.md](AGENTS.md) sebelum perubahan UI; catat hasil di [CHANGELOG.md](CHANGELOG.md). Desain mengutamakan visualisasi, animasi yang mendukung interaksi, pembukaan PRANA bertema kabut yang dapat dilewati, aksesibilitas, dan gerakan minimal untuk pengguna reduced motion.

Filter wilayah, tipe lokasi, dan stasiun menyelaraskan ringkasan, doughnut, tabel, dan peta. Tanggal, polutan lain, dan SUSPECT dinonaktifkan sampai ekspor mendukungnya. Indikator kesehatan tetap mencakup seluruh rumah sakit. Data berasal dari ekspor yang sudah ada; normalisasi unit dan klasifikasi masih perlu divalidasi secara analitis dan dijelaskan melalui kontrol `Data sementara` serta metodologi.


### Navigasi dan pencarian pilihan

Jalankan `bun run dev` untuk menggunakan routing lokal. Halaman utama adalah `/dashboard`; setiap tab mempunyai URL sendiri sesuai `dashboard/routes.json`, misalnya `/dashboard/pola-waktu`. URL dapat dibuka langsung, di-refresh, dan ditelusuri melalui Back/Forward. Build menghasilkan entry statis untuk setiap tab; pada hosting statis gunakan clean URLs atau directory-index routing. Seluruh aset menggunakan base `/dashboard/`.

Wilayah, tipe lokasi, dan stasiun dapat dicari dengan mengetik pada pilihan. Gunakan panah dan Enter atau klik hasil untuk menerapkan; Escape membatalkan pencarian. Pencarian yang belum dipilih tidak mengubah hasil analisis. Sidebar terbuka menampilkan wordmark PRANA dan chevron; saat diperkecil header hanya menampilkan chevron. Peta memakai Acuan Harian (ISPU 24-Jam) dan Acuan Tahunan (PP 22/2021), dengan legenda dinamis dari stasiun terpilih.
