# Change log

Record completed changes chronologically with dates in WIB. Each entry states the scope, reason, validation, and remaining limitations. Planned work belongs in the design audit or feature plan, not among completed changes.

## 14 November 2026 — Perbaikan: opening screen saat refresh tetap menunggu data selesai

- **Masalah**: Implementasi Option 3 sebelumnya memakai `setTimeout(reveal, 0)` saat `alreadySeen = true`, sehingga opening langsung dismiss sebelum `finish()` dipanggil — data belum tentu selesai dimuat dari cache.
- **Perbaikan (`dashboard/src/components/opening.ts`)**: Deadline `alreadySeen` diubah ke 3000 ms (bukan 0); `finish()` tetap mengontrol kapan `reveal()` dipanggil. Saat refresh, data cache cepat sehingga `finish()` terpanggil jauh sebelum 3 detik, lalu reveal segera (tanpa jeda 1.5 detik ekstra). Jika cache gagal, fallback 3 detik masih mencegah layar pembuka macet.
- **Validasi**: `bun run build` sukses.

## 14 November 2026 — Opening screen versi light mode (bone/krem)

- **Alasan**: Layar pembuka sebelumnya selalu gelap (`#0b242e`) tanpa adaptasi mode terang, sehingga tampak kontras janggal di light mode.
- **Perubahan (`dashboard/styles.css`)**: Menambahkan override `:root:not([data-theme='dark']) .opening-*` yang mengadaptasi warna ke palet bone/krem — `background: #d8cdbb`, teks `#1a3038`, progress bar hijau teal gelap, orbit/haze lebih terang, tombol skip transparan krem. Dark mode tidak berubah.
- **Validasi**: `bun run build` sukses; TypeScript bersih.

## 14 November 2026 — Cache browser + lewati layar pembuka saat refresh (Option 3)

- **Alasan**: Setiap refresh halaman memuat ulang semua data dari jaringan (~30 MB berkas `.bin` per stasiun) dan menampilkan layar pembuka kembali. Dengan cache browser dan penanda sesi, refresh melayani data dari *Cache Storage* lokal dan langsung membuka dashboard.
- **Cache API JSON (`dashboard/src/data/load.ts`)**:
  - `json()` mencoba membuka `'prana-data-v1'` di `caches` sebelum `fetch`; menyimpan respons ke cache pada hit pertama; melanjutkan ke jaringan biasa jika Cache API tidak tersedia atau dioperasikan dalam mode privat.
  - Berlaku untuk `tab1_ikhtisar.json` dan `data/station_catalog.json`.
- **Cache API binary/manifest (`dashboard/src/data/hourly.ts`)**:
  - Fungsi `fetchCached()` menggantikan `fetch()` langsung pada `manifest.json` dan setiap berkas `{station}-{mode}.bin`; tersedia di Web Worker karena Cache API didukung di worker context.
  - SHA-256 integrity check tetap berjalan terhadap byte yang didekompresi — cache hanya menyimpan blob terkompresi asli, sehingga hash tetap valid.
- **sessionStorage skip layar pembuka (`dashboard/src/components/opening.ts`)**:
  - `SESSION_KEY = 'prana_session_seen'` dibaca sebelum menampilkan layar pembuka.
  - Jika sudah `'1'`, `deadline` di-set ke `setTimeout(reveal, 0)` — layar pembuka langsung dilewati.
  - `reveal()` menyetel flag sesaat sebelum animasi keluar; pengguna yang buka tab baru atau membuka di sesi berbeda tetap melihat layar pembuka.
  - Saat `alreadySeen`, `finish()` juga tidak menambah jeda 1,5 detik — data sudah cepat dari cache.
- **Validasi**:
  - `bun x tsc --noEmit` lolos 100% tanpa error.
  - Unit test `tests/*.test.ts` (89/89 pengujian) lolos 100%.
  - `bun run build` sukses (bundel produksi teregenerasi).

## 14 November 2026 — Penambahan jeda 1,5 detik pada layar pembuka setelah proses selesai

- **Durasi Layar Pembuka (`dashboard/src/components/opening.ts`)**:
  - Mengubah logika timer penyelesaian pada `createOpening().finish()` agar memberikan jeda transisi tepat 1,5 detik (1.500 ms) setelah seluruh proses pemuatan dan pra-komputasi selesai.
  - Memperpanjang batas waktu pengaman cadangan (*fallback deadline*) menjadi 10 detik agar transisi tidak terpotong saat memuat di jaringan lambat, sementara tombol "Lewati" tetap dapat ditekan pengguna kapan saja untuk langsung membuka dashboard.
- **Validasi**:
  - `bun x tsc --noEmit` lolos 100% tanpa error (`strict: true`).
  - Unit test `tests/*.test.ts` (89/89 pengujian) lolos 100%.
  - `bun run build` sukses meregenerasi bundel produksi `app.js` (568,7 kB) dan `app.css` (81,8 kB).

## 14 November 2026 — Penuntasan pemanasan komputasi Tab 3 & 4 pada layar pembuka (opening screen)

- **Sinkronisasi Pra-Komputasi Tab 3 & 4 (`dashboard/src/main.ts`, `dashboard/src/components/opening.ts`)**:
  - Menyelaraskan eksekusi `analysisCache.prepare(filters.state())` di `dashboard/src/main.ts` agar di-`await` secara tuntas sebelum layar pembuka diangkat (`opening.finish()`).
  - Sebelumnya, komputasi analisis dijalankan tanpa `await` (`void`), sehingga layar pembuka terangkat lebih awal sebelum Web Worker selesai memproses agregasi data per jam untuk Tab 3 (Pola Waktu) dan Tab 4 (Faktor Pemicu).
  - Menyesuaikan batas waktu pengaman (*fallback deadline*) pada `createOpening()` menjadi 6 detik agar komputasi berat tidak terpotong prematur pada perangkat atau koneksi lambat.
  - Hasilnya: saat pertama kali pengguna membuka Tab 3 atau Tab 4, seluruh metrik, grafik diurnal, deret waktu, dan matriks ekstrem langsung tersaji seketika (0 ms) dari cache tanpa menampilkan status "Memuat analisis pilihan…".
- **Validasi**:
  - `bun x tsc --noEmit` lolos 100% tanpa error (`strict: true`).
  - Unit test `tests/*.test.ts` (89/89 pengujian) lolos 100%.
  - `bun run build` sukses meregenerasi bundel produksi `app.js` (568,8 kB) dan `app.css` (81,8 kB).

## 14 November 2026 — Penyelarasan warna latar kontainer logo Gelar Rasa dengan kartu jargon

- **Harmonisasi Warna Latar Sidebar (`dashboard/styles.css`)**:
  - Mengubah warna latar kontainer logo Gelar Rasa (`.competition-brand`) dari `var(--surface)` menjadi `var(--surface-secondary)` (`#d6cab8` pada mode terang / Bone), menyamakan persis dengan warna latar kartu jargon di atasnya.
  - Mempertahankan aturan latar kontras tinggi (cyan `var(--accent)`) pada mode gelap (`:root[data-theme='dark']`) agar teks dan elemen logo gelap tetap terbaca optimal.
- **Validasi**:
  - `bun x tsc --noEmit` lolos 100% tanpa error (`strict: true`).
  - Unit test `tests/*.test.ts` (89/89 pengujian) lolos 100%.
  - `bun run build` sukses meregenerasi bundel produksi `app.js` (568,7 kB) dan `app.css` (81,8 kB).

## 14 November 2026 — Penghapusan ikon petir pada kartu jargon sidebar

- **Penyempurnaan Kartu Jargon (`dashboard/src/components/shell.ts`, `dashboard/styles.css`)**:
  - Menghapus ikon petir (*spark*) dari kartu slogan sidebar.
  - Menjadikan kartu tampil murni tipografis berbingkai aksen kiri (`border-left: 3px solid var(--accent)`), padding `10px 14px`, dengan dua baris sajak jargon dalam font `'Space Grotesk'` serta penekanan aksen tebal pada kata **Udara** dan **Raga**.
- **Validasi**:
  - `bun x tsc --noEmit` lolos 100% tanpa error (`strict: true`).
  - Unit test `tests/*.test.ts` (89/89 pengujian) lolos 100%.
  - `bun run build` sukses meregenerasi bundel produksi `app.js` (568,7 kB) dan `app.css` (81,8 kB).

## 14 November 2026 — Penyederhanaan kartu jargon sidebar (menghapus label "Jargon PRANA")

- **Tipografi & Tata Letak Kartu Jargon (`dashboard/src/components/shell.ts`, `dashboard/styles.css`)**:
  - Menghapus teks judul meta `"Jargon PRANA"` dari kartu slogan sidebar agar tampil lebih bersih (*clean*), lugas, dan elegan tanpa label teks redundan.
  - Menata kartu jargon menjadi tata letak baris horizontal terpadu (*flex row*): ikon badge *spark* di sisi kiri berdampingan langsung dengan dua baris sajak jargon berbobot aksen pada kata **Udara** dan **Raga**.
- **Validasi**:
  - `bun x tsc --noEmit` lolos 100% tanpa error (`strict: true`).
  - Unit test `tests/*.test.ts` (89/89 pengujian) lolos 100%.
  - `bun run build` sukses meregenerasi bundel produksi `app.js` (568,8 kB) dan `app.css` (82,1 kB).

## 14 November 2026 — Penambahan frasa "baku mutu" pada pertanyaan riset Tab 2

- **Penyelarasan Pertanyaan Riset Tab 2 (`dashboard/src/main.ts`)**:
  - Menambahkan 2 kata ("baku mutu") pada teks `question` di `complianceFeature`:
    *"Sejauh mana stasiun memenuhi acuan baku mutu kualitas udara, seberapa sering terjadi pelampauan, dan bagaimana perubahan kepatuhannya antar-tahun?"*
  - Menyelaraskan istilah normatif sesuai regulasi lingkungan hidup Indonesia (PP 22/2021 tentang Baku Mutu Udara Ambien).
- **Validasi**:
  - `bun x tsc --noEmit` lolos 100% tanpa error (`strict: true`).
  - Unit test `tests/*.test.ts` (89/89 pengujian) lolos 100%.
  - `bun run build` sukses meregenerasi bundel produksi `app.js` (568,9 kB) dan `app.css` (82,3 kB).

## 14 November 2026 — Desain kartu visual Jargon PRANA di sidebar

- **Transformasi Visual Jargon Sidebar (`dashboard/src/components/shell.ts`, `dashboard/styles.css`)**:
  - Mengubah teks polos jargon `"Cerdas Membaca Udara,\nBijak Menjaga Raga."` menjadi komponen kartu visual (`.sidebar-jargon`):
    - Dilengkapi header badge bertuliskan **Jargon PRANA** dengan ikon petir/spark (`icon('spark')`) beraksen warna teal/cyan.
    - Tipografi menggunakan font *display* `'Space Grotesk'` dengan penekanan aksen tebal pada kata kunci **Udara** dan **Raga**.
    - Menggunakan kontainer kartu dengan latar `var(--surface-secondary)`, garis batas halus (`border`), sudut melengkung `10px`, dan garis aksen vertikal di sebelah kiri (`border-left: 3px solid var(--accent)`).
    - Memiliki efek interaktif hover lembut yang berpadu selaras dengan tema Bone (light mode) maupun dark mode.
  - Tetap tersembunyi secara rapi saat navigasi rail / collapsed (`.rail-navigation`) dan tampil penuh pada mode expanded serta mobile drawer.
- **Validasi**:
  - `bun x tsc --noEmit` lolos 100% tanpa error (`strict: true`).
  - Unit test `tests/*.test.ts` (89/89 pengujian) lolos 100%.
  - `bun run build` sukses meregenerasi bundel produksi `app.js` (568,9 kB) dan `app.css` (82,3 kB).

## 14 November 2026 — Penghapusan accordion Metodologi & cakupan data pada Tab 2

- **Pembersihan Konten Tab 2 (`dashboard/src/features/compliance/view.ts`, `dashboard/styles.css`)**:
  - Menghapus komponen accordion `<details class="data-disclosure compliance-methodology">` bertuliskan "Metodologi & cakupan data" beserta teks penjelasannya dari bagian bawah tampilan Tab 2 (Kepatuhan Regulasi).
  - Menghapus aturan CSS `.compliance-methodology` yang sudah tidak terpakai dari `dashboard/styles.css`.
  - Penjelasan metodologi lengkap tetap dapat diakses pengguna melalui tombol dialog global "Metodologi" di header aplikasi (`topbar`).
- **Validasi**:
  - `bun x tsc --noEmit` lolos 100% tanpa error (`strict: true`).
  - Unit test `tests/*.test.ts` (89/89 pengujian) lolos 100%.
  - `bun run build` sukses meregenerasi bundel produksi `app.js` (568,4 kB) dan `app.css` (81,0 kB).

## 14 November 2026 — Penambahan garis pembatas (divider) antara logo PRANA dan menu navigasi sidebar

- **Divider Navigasi Sidebar (`dashboard/src/components/shell.ts`, `dashboard/styles.css`)**:
  - Menambahkan elemen pembatas semantik `<hr class="sidebar-divider" />` di antara header brand (`.sidebar-brand-row`) dan daftar menu (`.navigation`).
  - Menyelaraskan koordinat vertikal (Y pixel) garis pembatas secara presisi pada Y = 104px, sejajar tepat di tengah garis pita fact-ticker (Y = 88px s.d. 120px) di sebelah kanannya.
  - Menjamin garis pembatas tetap tampil secara konsisten baik pada saat sidebar dibuka (`open`) maupun ditutup (`close` / `rail-navigation`).
- **Validasi**:
  - `bun x tsc --noEmit` lolos 100% tanpa error (`strict: true`).
  - Unit test `tests/*.test.ts` (89/89 pengujian) lolos 100%.
  - `bun run build` sukses meregenerasi bundel produksi `app.js` (573,1 kB) dan `app.css` (81,1 kB).

## 14 November 2026 — Penyesuaian ukuran font kartu KPI Stasiun Paling Kritis Tab 1 menjadi 28px

- **Tipografi KPI Stasiun Paling Kritis (`dashboard/styles.css`)**:
  - Menetapkan ukuran font `.metric-station .metric-value strong` langsung ke `font-size: 28px;` pada desktop.
  - Memastikan ukuran kode stasiun 11 karakter (`AQMS-BJB-01`) tampil konsisten, stabil di ukuran 28px tanpa scaling fluktuatif, serta pas dan seimbang dengan 3 kartu KPI lainnya.
- **Validasi**:
  - `bun x tsc --noEmit` lolos 100% tanpa error (`strict: true`).
  - Unit test `tests/*.test.ts` (89/89 pengujian) lolos 100%.
  - `bun run build` sukses meregenerasi bundel produksi `app.js` (573,1 kB) dan `app.css` (81,0 kB).

## 14 November 2026 — Penyelarasan warna menu aktif sidebar dengan tema Bone

- **Penyelarasan Item Navigasi Sidebar Aktif (`dashboard/styles.css`)**:
  - Mengubah warna menu sidebar yang sedang terpilih (`.nav-item[aria-current='page']`) dan saat disentuh/di-hover (`.nav-item:hover`) agar harmonis dengan palet tema Bone `#E3DAC9`:
    - Latar belakang menggunakan `var(--canvas)` (`#d8cdbb`), memberikan kedalaman kontras lembut di atas permukaan sidebar.
    - Garis pembatas menggunakan `var(--border)` (`#c4b6a1`).
    - Warna teks menggunakan `var(--text)` (`#152d38`) dengan bobot `font-weight: 600`.
    - Ikon dan garis indikator vertikal di sisi kiri (`::before`) mempertahankan aksen teal `var(--accent)` (`#087f8c`).
  - Mengubah `--accent-soft` di `:root` agar menggunakan `color-mix(in srgb, var(--accent) 14%, var(--surface))` sehingga seluruh elemen aksen lembut berpadu natural dengan warna dasar Bone tanpa menyisakan efek warna yang bertabrakan.
- **Validasi**:
  - `bun x tsc --noEmit` lolos 100% tanpa error (`strict: true`).
  - Unit test `tests/*.test.ts` (89/89 pengujian) lolos 100%.
  - `bun run build` sukses membangun bundel produksi `app.js` (573,1 kB) dan `app.css` (80,3 kB).

## 14 November 2026 — Penyesuaian latar logo Gelar Rasa (Light Mode ke semula, Dark Mode ke Cyan)

- **Latar Logo Gelar Rasa (`dashboard/styles.css`)**:
  - Mengembalikan warna latar `.competition-brand` di mode terang (Light Mode) ke permukaan sidebar semula: `background: var(--surface); border: 1px solid var(--border);`.
  - Mengubah warna latar `.competition-brand` di mode gelap (Dark Mode) menjadi warna Cyan cerah (`background: var(--accent); border-color: var(--accent);`), memberikan kontras tinggi bagi elemen logo gelap sekaligus menyatu serasi dengan aksen tema dark mode.
- **Validasi**:
  - `bun x tsc --noEmit` lolos 100% tanpa error (`strict: true`).
  - Unit test `tests/*.test.ts` (89/89 pengujian) lolos 100%.
  - `bun run build` sukses meregenerasi bundel produksi `app.js` (573,1 kB) dan `app.css` (81,0 kB).

## 14 November 2026 — Penyelarasan posisi vertikal menu sidebar open/close dan penghapusan teks ANALISIS

- **Penyelarasan Vertikal Navigasi Sidebar (`dashboard/src/components/shell.ts`, `dashboard/styles.css`)**:
  - Menghapus elemen teks caption `ANALISIS` (`<p class="nav-caption">`) di atas daftar menu sidebar sehingga posisi vertikal setiap menu tidak lagi bergeser/meloncat saat sidebar diekspansi (open) maupun di-collapse (close).
  - Menyelaraskan tinggi kartu item navigasi `.nav-item` pada saat open menjadi `height: 44px; min-height: 44px; padding: 10px 14px;`, menyamakan persis dengan tinggi 44px saat mode rail collapsed (`.rail-navigation .nav-item`).
  - Hasilnya: seluruh 6 ikon menu tetap berada pada koordinat vertikal (Y pixel) yang identik saat transisi buka-tutup sidebar.
- **Validasi**:
  - `bun x tsc --noEmit` lolos 100% tanpa error (`strict: true`).
  - Unit test `tests/*.test.ts` (89/89 pengujian) lolos 100%.
  - `bun run build` sukses meregenerasi bundel produksi `app.js` (573,1 kB) dan `app.css` (81,0 kB).

## 14 November 2026 — Latar kontainer logo Gelar Rasa pada Dark Mode

- **Visibilitas Logo Gelar Rasa (`dashboard/styles.css`)**:
  - Memberikan latar belakang kontainer putih `#ffffff` dan bayangan lembut pada `.competition-brand` khusus di mode gelap (`:root[data-theme='dark']`) agar teks dan elemen gelap pada logo resmi Gelar Rasa tetap kontras, terbaca jelas, dan tidak menyatu dengan warna gelap sidebar/dashboard.
- **Validasi**:
  - `bun x tsc --noEmit` lolos 100% tanpa error (`strict: true`).
  - Unit test `tests/*.test.ts` (89/89 pengujian) lolos 100%.
  - `bun run build` sukses meregenerasi bundel produksi `app.js` (573,1 kB) dan `app.css` (81,0 kB).

## 14 November 2026 — Latar kontainer logo Gelar Rasa pada Dark Mode

- **Visibilitas Logo Gelar Rasa (`dashboard/styles.css`)**:
  - Memberikan latar belakang kontainer putih `#ffffff` dan bayangan lembut pada `.competition-brand` khusus di mode gelap (`:root[data-theme='dark']`) agar teks dan elemen gelap pada logo resmi Gelar Rasa tetap kontras, terbaca jelas, dan tidak menyatu dengan warna gelap sidebar/dashboard.
- **Validasi**:
  - `bun x tsc --noEmit` lolos 100% tanpa error (`strict: true`).
  - Unit test `tests/*.test.ts` (89/89 pengujian) lolos 100%.
  - `bun run build` sukses meregenerasi bundel produksi `app.js` (573,1 kB) dan `app.css` (81,0 kB).

## 14 November 2026 — Pemulihan penuh gaya navigasi dark mode seperti semula

- **Restorasi Gaya Menu Sidebar Dark Mode (`dashboard/styles.css`)**:
  - Memastikan gaya menu navigasi sidebar pada mode gelap (`:root[data-theme='dark']`) tetap 100% persis seperti semula:
    - Item terpilih (`.nav-item[aria-current='page']`): teks dan ikon aksen cyan cerah `var(--accent)` (`#64d9cc`), latar belakang `var(--accent-soft)` (`#173c42`), garis border `color-mix(in srgb, var(--accent) 20%, transparent)`, dan garis indikator kiri `width: 3px`.
    - Item saat di-hover (`.nav-item:hover`): `color: var(--accent)` dan `background: var(--accent-soft)`.
  - Penyesuaian tema Bone `#E3DAC9` dan kontras kanvas `#d8cdbb` hanya berlaku secara spesifik untuk light mode.
- **Validasi**:
  - `bun x tsc --noEmit` lolos 100% tanpa error (`strict: true`).
  - Unit test `tests/*.test.ts` (89/89 pengujian) lolos 100%.
  - `bun run build` sukses meregenerasi bundel produksi `app.js` (573,1 kB) dan `app.css` (80,8 kB).

## 14 November 2026 — Pemulihan penuh gaya navigasi dark mode seperti semula

- **Restorasi Gaya Menu Sidebar Dark Mode (`dashboard/styles.css`)**:
  - Memastikan gaya menu navigasi sidebar pada mode gelap (`:root[data-theme='dark']`) tetap 100% persis seperti semula:
    - Item terpilih (`.nav-item[aria-current='page']`): teks dan ikon aksen cyan cerah `var(--accent)` (`#64d9cc`), latar belakang `var(--accent-soft)` (`#173c42`), garis border `color-mix(in srgb, var(--accent) 20%, transparent)`, dan garis indikator kiri `width: 3px`.
    - Item saat di-hover (`.nav-item:hover`): `color: var(--accent)` dan `background: var(--accent-soft)`.
  - Penyesuaian tema Bone `#E3DAC9` dan kontras kanvas `#d8cdbb` hanya berlaku secara spesifik untuk light mode.
- **Validasi**:
  - `bun x tsc --noEmit` lolos 100% tanpa error (`strict: true`).
  - Unit test `tests/*.test.ts` (89/89 pengujian) lolos 100%.
  - `bun run build` sukses meregenerasi bundel produksi `app.js` (573,1 kB) dan `app.css` (80,8 kB).

## 14 November 2026 — Pembaruan warna tema Bone #E3DAC9 dan penghapusan teks scope status Tab 6

- **Penyesuaian Warna Tema Bone (`dashboard/styles.css`)**:
  - Mengubah warna surface utama (`--surface`) pada mode terang menjadi warna Bone `#E3DAC9`.
  - Menyelaraskan variabel warna pendukung:
    - `--canvas`: `#d8cdbb` (latar greige / warm canvas yang menyatu dengan kartu Bone).
    - `--surface-secondary`: `#d6cab8` (permukaan sekunder untuk baris/badge).
    - `--border`: `#c4b6a1` (border beraksen warm linen).
    - `--accent-soft`: `#d2ebe6` (wash aksen mint-teal lembut).
    - `--shadow`: `0 3px 15px rgb(30 25 20 / 5%)`.
- **Pembersihan Teks Status Filter Tab 6 (`dashboard/src/components/filters.ts`)**:
  - Menghapus teks deskripsi cakupan yang muncul pada header filter saat membuka Tab 6 (*"Tanggal dan faskes membatasi bukti Tab 6; polutan dan QC mengubah cakupan paparan"*). Header filter kini tetap bersih dan konsisten dengan seluruh tab lain (`Filter data` dan ringkasan filter aktif).
- **Validasi**:
  - `bun x tsc --noEmit` lolos 100% tanpa error (`strict: true`).
  - Unit test `tests/*.test.ts` (89/89 pengujian) lolos 100%.
  - `bun run build` sukses membangun bundel produksi `app.js` (573,1 kB) dan `app.css` (80,2 kB).

## 14 November 2026 — Pembaruan tagline sidebar, tema warna light mode #f1e1b0, dan optimasi mobile topbar

- **Pembaruan Tagline Sidebar (`dashboard/src/components/shell.ts`)**:
  - Mengubah teks konteks branding sidebar bawah (`.sidebar-context`) dari:
    `Kualitas udara.\nKesehatan bersama.`
    menjadi:
    `Cerdas Membaca Udara,\nBijak Menjaga Raga.`
- **Penyelarasan Warna Light Mode (`dashboard/styles.css`)**:
  - Mengubah variabel warna surface utama (`--surface`) pada mode terang dari `#fcfaf5` (putih bersih) menjadi `#f1e1b0` (warm sand / cream).
  - Menyelaraskan seluruh variabel latar dan aksen pendukung mode terang agar harmonis dengan palet utama `#f1e1b0`:
    - `--canvas`: `#e8d7a4` (latar halaman dengan kontras lembut di balik kartu).
    - `--surface-secondary`: `#e5d39c` (permukaan sekunder untuk header tabel dan badge).
    - `--border`: `#d4c188` (garis pembatas bernuansa hangat).
    - `--accent-soft`: `#d5ede7` (wash mint-teal lembut yang kontras elegan dengan warna dasar cream).
    - `--shadow`: bayangan halus hangat `rgb(45 35 15 / 6%)`.
    - Mengganti warna hardcoded pada `.competition-brand` agar mewarisi `var(--surface)` dan `var(--border)`.
  - Dark mode dipertahankan sepenuhnya tanpa perubahan sesuai instruksi pengguna.
- **Optimasi Topbar Dimensi Mobile (`dashboard/styles.css`)**:
  - Merekonstruksi layout `.topbar` pada layar $\le 767\text{px}$ menggunakan CSS Grid 2-baris yang ramping:
    - Baris 1: Tombol navigasi hamburger `[☰]`, sub-judul branding `PRANA`, dan aksi cepat (toggle tema & tombol modal metodologi) sejajar dalam satu baris horizontal kompak.
    - Baris 2: Judul wajib kompetisi `DA2026_Dashboard_NasiBakarCumiHitamPakKris_AlfinJayadi` membentang selebar layar dengan tipografi proporsional (13px, line-height 1.25, 2 baris rapi tanpa terpotong).
    - Menghilangkan `flex-basis: 100%` pada aksi yang sebelumnya memaksa tombol turun ke baris ketiga, serta mengurangi padding dan min-height dari ~192px menjadi ~84px (pengurangan tinggi header >50%).
- **Validasi**:
  - `bun x tsc --noEmit` lolos 100% tanpa error (`strict: true`).
  - Unit test `tests/*.test.ts` (89/89 pengujian) lolos 100%.
  - `bun run build` sukses membangun bundel produksi `app.js` (573,3 kB) dan `app.css` (80,2 kB).

## 14 November 2026 — Harmonisasi ambang ekstrem P90 dan penyelarasan visual Tab 6

- **Harmonisasi Ambang Ekstrem P90 untuk Seluruh Dashboard (`aggregate.ts`, `charts.ts`, `view.ts`, `methodology.ts`, `scripts/export-chat-index.py`, `rag-index.json`)**:
  - Menyelaraskan ambang batas jam ekstremitas polusi pada Tab 4 (Faktor Pemicu) dari persentil ke-95 (P95) menjadi persentil ke-90 (P90) agar seragam dengan basis persentil P90 yang digunakan pada Tab 6 (Asumsi Kapasitas Manual).
  - Memperbarui perhitungan kuantil di `aggregate.ts` (`quantile(allHourlyValues, 0.90)` dan `quantile(sVals, 0.90)`), label dataset grafik di `charts.ts` (`Jam Ekstrem (>P90)` dan `Jam Normal (≤P90)`), pilihan segmented tombol toggle dan KPI pada `view.ts` (`Ambang Global (P90)` vs `Ambang per Stasiun (P90)`), serta dokumentasi Pilar 4 Metodologi pada `methodology.ts`.
  - Memperbarui ringkasan fitur pada `scripts/export-chat-index.py` dan membangun ulang indeks RAG chat (`rag-index.json`).
- **Penyelarasan Visual Tab 6 (`dashboard/styles.css`)**:
  - Menambahkan garis pembagi vertikal pada `.admission-comparison-grid` di layar desktop (`border-right: 1px solid var(--border)` pada `min-width: 768px`) dan garis pembagi horizontal pada layar mobile/tablet (`border-bottom: 1px solid var(--border)` pada `max-width: 767px`) dengan jarak antar-grafik `gap: 24px`, menyelaraskan 100% dengan standar kontainer 2 grafik di Tab 2, Tab 3, Tab 4, dan Tab 5.
  - Menyelaraskan kelengkungan sudut kartu metrik hasil simulasi `.admission-result` dari `border-radius: 10px` menjadi `border-radius: 14px` sesuai token desain sistem kartu metrik/KPI aplikasi.
- **Validasi**:
  - `bun x tsc --noEmit` lolos 100% tanpa error (`strict: true`).
  - Unit test `tests/*.test.ts` (89/89 pengujian) lolos 100%.
  - `bun run build` sukses membangun bundel produksi `app.js` (573,3 kB) dan `app.css` (79,1 kB).

## 14 November 2026 — Penyelarasan warna & gaya kartu KPI Tab 5 (Dampak Kesehatan)

- **Penyelarasan Kartu Metrik Tab 5 (`dashboard/styles.css`)**:
  - Mengubah aturan gaya `.health-summary-panel .health-metrics .metric` agar menggunakan warna latar belakang `background: var(--surface)` dan kelengkungan sudut `border-radius: 14px`, menyelaraskan 100% dengan kartu KPI pada Tab 1, Tab 2, Tab 3, dan Tab 4.
  - Menghilangkan aturan sebelumnya yang menggunakan `background: var(--surface-secondary)` (yang menyebabkan kartu KPI di Tab 5 tampak lebih gelap/kusam dan bernada abu-abu berbeda dari tab lainnya) dan `border-radius: 10px`.
- **Validasi**:
  - `bun x tsc --noEmit` lolos 100% tanpa error (`strict: true`).
  - Unit test `tests/*.test.ts` (89/89 pengujian) lolos 100%.
  - `bun run build` sukses membangun bundel produksi `app.js` (573,3 kB) dan `app.css` (78,9 kB).

## 14 November 2026 — Penyelarasan penuh alur penyaringan AQMS ke seluruh tab (Tab 1–6)

- **Penyelarasan Tab 1 ke Kontrak Penyaringan Bersama (`scripts/export-tab1.py`, `dataset/dashboard/tab1_ikhtisar.json`, `dashboard/tab1_ikhtisar.json`, `dashboard/src/features/overview/model.ts`, `dashboard/src/data/types.ts`)**:
  - Mengintegrasikan seluruh tab ke satu sumber kebenaran (*single source of truth*) berbasis `compliance_daily.json` dan skrip deterministik `scripts/export-tab1.py` (tersedia via `npm run data:overview`):
    1. **Agregasi Harian Berbasis $\ge 18$ Jam Unik**: Menggantikan filter hitungan baris lama dengan agregasi bertingkat (rerata per jam, dilanjutkan rerata harian $\ge 18$ jam unik) dan deduplikasi timestamp awal. Stasiun `AQMS-PLB-01` kini mencatat 696 hari valid terverifikasi.
    2. **Moving Average 8 Jam untuk CO & O3**: Memperbarui evaluasi baku mutu PP 22/2021 dan kategori ISPU untuk CO dan O3 pada Tab 1 agar menggunakan nilai maksimum 17 jendela bergerak 8 jam harian (`m8`) sesuai regulasi hukum, bukan rerata 24 jam.
    3. **Sinkronisasi Metrik Nasional**: Angka pelampauan 24 jam nasional PM2.5 diselaraskan menjadi 17,3% (4.202 hari terlampaui dari 24.236 hari-stasiun valid) dan rata-rata nasional menjadi 41,72 µg/m³.
    4. **Harmonisasi PM2.5 Ranking & ISPU Donut**: Donut dan pemeringkatan stasiun diturunkan langsung dari observasi 18 jam terukur, dengan JMB-02 tetap mempertahankan identitas tanpa menjadi stasiun nol palsu.
- **Pembaruan Pengujian (`tests/overview.test.ts`, `package.json`)**:
  - Memperbarui ekspektasi pengujian `data.nationalExceedance` menjadi `17.3`.
  - Menambahkan script `"data:overview": "python3 scripts/export-tab1.py"` pada `package.json`.
- **Validasi**:
  - `bun x tsc --noEmit` lolos 100% tanpa error (`strict: true`).
  - Unit test `tests/*.test.ts` (89/89 pengujian) lolos 100%.
  - `bun run build` sukses membangun bundel produksi `app.js` (573,3 kB) dan `app.css` (78,9 kB).

## 14 November 2026 — Restrukturisasi Teks Metodologi Dashboard Berbasis Keputusan Analitis

- **Restrukturisasi Modal Metodologi (`dashboard/src/components/methodology.ts`, `dashboard/src/components/aqms-filtering-methodology.ts`, `dashboard/styles.css`)**:
  - Mengubah penyajian modal/drawer metodologi dari teks naratif panjang (*wall of text*) menjadi format terstruktur yang berfokus pada **keputusan analitis terapan (*analytical decisions*)** dan transparansi regulasi:
    1. **Kartu Ringkasan Sumber & Cakupan**: Menampilkan sumber data (AQMS, admisi RS anonim, master sites, metadata), cakupan observasi waktu & stasiun dinamis, faskes terdaftar, serta prinsip dasar analisis.
    2. **Pilar 1 (Integritas Data, QC & Kebijakan Nol-Imputasi)**: Bawaan hanya `VALID` (`SUSPECT` eksplisit), deduplikasi timestamp awal, syarat validitas harian $\ge 18$ jam unik, dan penegasan kebijakan *zero-imputation* (data hilang dilaporkan `null`, bukan nol tiruan).
    3. **Pilar 2 (Standarisasi Satuan & Kalibrasi Instrumen)**: Normalisasi partikulat PM2.5/PM10 faktor $\times 1.000$ untuk logger berlabel ppm di 3 stasiun (skala mg/m³ ke $\mu\text{g}/\text{m}^3$), dan konversi molekuler gas kriteria berbasis berat molekul pada kondisi standar ($25^\circ\text{C}, 1\text{ atm}$).
    4. **Pilar 3 (Kepatuhan Regulasi & Baku Mutu PP 22/2021 & ISPU)**: Aturan evaluasi 24 jam untuk PM2.5/PM10/SO2/NO2, moving average 8 jam harian untuk CO/O3 (maksimum dari 17 jendela, min. 13 jendela lengkap), syarat kelengkapan tahunan 75% untuk kepatuhan regulasi, serta formula IKU stasiun adaptasi Permen LHK 27/2021.
    5. **Pilar 4 (Dinamika Temporal & Faktor Pemicu Tab 3–4)**: Dekomposisi varians polusi ($\eta^2$ ANOVA untuk faktor kategorik dan $R^2$ regresi linier untuk cuaca kontinu), ambang ekstremitas P95 lokal, pemisahan musim karhutla (Agu–Okt) vs normal, dan normalisasi kecepatan angin per tipe zonasi.
    6. **Pilar 5 (Dampak Kesehatan & Tekanan Rumah Sakit Tab 5)**: Korelasi jeda waktu Pearson lag 0–7 hari ($\ge 30$ pasangan), stratifikasi respons kuintil P1–P5 relatif terhadap baseline faskes, dan definisi rasio tekanan tempat tidur RS $(\text{Pernapasan} + \text{CVD}) / \text{Kapasitas} \times 100$.
    7. **Pilar 6 (Pemodelan Rekomendasi & Ekspansi Tab 6)**: Indeks prioritas wilayah baru berbasis normalisasi min-maks 3 kriteria (baseline PM2.5, lalu lintas, jarak tetangga terdekat) dengan bobot adaptif, radius ilustrasi spasial Haversine 10–300 km, serta simulasi skenario kapasitas tempat tidur faskes.
    8. **Alur Penyaringan Bertingkat AQMS & Provenance Sumber Data**: 7 langkah operasional penyaringan dan penegasan determinisme jejak skrip (`export-compliance.py`, `export-hourly.py`, dll.) tanpa fallback sintetis fiktif.
  - Menambahkan gaya visual modern pada `.method-meta-card`, `.method-badge`, `.method-section`, `.method-list`, dan `.method-intro`.
- **Validasi**:
  - `bun x tsc --noEmit` lolos 100% tanpa error (`strict: true`).
  - Unit test `tests/*.test.ts` (89/89 pengujian) lolos 100%.
  - `bun run build` sukses membangun bundel produksi `app.js` (573,2 kB) dan `app.css` (78,9 kB).

## 14 November 2026 — Penerapan garis pembagi (*divider*) pada seluruh kontainer 2 grafik

- **Penyelarasan Garis Pembagi Visual (`dashboard/styles.css`, `dashboard/src/features/temporal/view.ts`, `dashboard/src/features/drivers/view.ts`)**:
  - Menstandarisasi garis pembagi (*divider border*) yang tampak jelas (*visible*) pada seluruh panel yang memiliki 2 grafik berdampingan di seluruh dashboard, konsisten dengan panel acuan *Profil Polusi & Tren Harian*:
    1. **Tab 2**: *Perbandingan Konsentrasi Antarstasiun* (`.compliance-subpanel:first-child`).
    2. **Tab 3**: *Episode Pelampauan & Keparahan Ekstrem* (`.episode-comparison-grid > :first-child`).
    3. **Tab 4**: *Arah Angin & Dispersi Polutan* (`.wind-dynamics-grid > :first-child`).
    4. **Tab 4**: *Lalu Lintas, Jarak Jalan & Konsentrasi* (`.traffic-scatter-grid > :first-child`).
    5. **Tab 4**: *Karakteristik & Waktu Jam Ekstrem* (`.extreme-comparison-container > :first-child`).
    6. **Tab 5**: *Hubungan Paparan & Respons Kasus* (`.health-split-grid > :first-child`).
    7. **Tab 5**: *Episode Ekstrem & Stratifikasi Kelompok Rentan* (`.health-split-grid > :first-child`).
  - Mengatur perilaku responsif:
    - Mode Desktop ($\ge 1024\text{px}$ / $\ge 1001\text{px}$): Garis pembagi vertikal di sisi kanan kolom pertama (`border-right: 1px solid var(--border); padding-right: 24px; gap: 24px;`) yang memposisikan garis tepat di tengah ruang kosong 48px antar-grafik.
    - Mode Mobile/Tablet ($\le 1023\text{px}$ / $\le 1000\text{px}$): Garis pembagi horizontal di dasar kolom pertama (`border-bottom: 1px solid var(--border); padding-bottom: 24px; gap: 24px;`).
- **Validasi**:
  - `bun x tsc --noEmit` lolos 100% tanpa error (`strict: true`).
  - Unit test `tests/*.test.ts` (53/53 pengujian) lolos 100%.
  - `bun run build` sukses membangun bundel produksi `app.js` (554,6 kB) dan `app.css` (68,8 kB).

## 14 November 2026 — Pembaruan tooltip interaktif pada analisis faktor pemicu (Tab 4)

- **Penyempurnaan Tooltip Scatter Lalu Lintas & Jarak Jalan (`dashboard/src/features/drivers/charts.ts`)**:
  - Mengubah format tooltip dari teks teknis `x=... → y=...` menjadi kartu keterangan terstruktur:
    - Judul: `[Kode Stasiun] · [Tipe Zonasi]` (atau `Garis Tren Regresi`)
    - Baris 1: `Lalu lintas: X kend/jam` atau `Jarak ke jalan: X m`
    - Baris 2: `Konsentrasi: Y µg/m³`
- **Pengaktifan Hover Tunggal & Fokus pada Dispersi Angin (`dashboard/src/features/drivers/charts.ts`)**:
  - Mengubah mode interaksi tooltip dari `mode: 'index'` (yang menampilkan seluruh tipe zonasi sekaligus sehingga sangat ramai) menjadi `mode: 'nearest', intersect: true` (hanya fokus pada 1 titik/garis zonasi yang disentuh kursor).
  - Menampilkan ringkasan bersih 1 baris untuk zonasi terkait:
    - Judul: `[Tipe Zonasi] · Angin [X] m/s`
    - Baris: `Rasio: X× median` (pada mode rasio) atau `Konsentrasi: X µg/m³` (pada mode absolut).
- **Validasi**:
  - `bun x tsc --noEmit` lolos 100% tanpa error (`strict: true`).
  - Unit test `tests/*.test.ts` (53/53 pengujian) lolos 100%.
  - `bun run build` sukses membangun bundel produksi `app.js` (554,6 kB) dan `app.css` (67,6 kB).

## 14 November 2026 — Restrukturisasi Tab 5: Pengelompokan 4 grafik ke 2 kontainer terpadu (50:50)

- **Penyatuan Kontainer Analitis Tab 5 (`dashboard/src/features/health/view.ts`, `dashboard/styles.css`)**:
  - Mengelompokkan 4 grafik analisis dampak kesehatan menjadi 2 kontainer panel terpadu dengan proporsi simetris 50:50:
    1. **Kelompok 1 (`Hubungan Paparan & Respons Kasus`)**:
       - *Kiri (50% — Line Chart)*: `Jeda Paparan & Kasus` (Korelasi Pearson eksploratif lag 0–7 hari).
       - *Kanan (50% — Bar Chart)*: `Kasus Menurut Tingkat Paparan` (Distribusi 5 kuintil konsentrasi polutan).
    2. **Kelompok 2 (`Episode Ekstrem & Stratifikasi Kelompok Rentan`)**:
       - *Kiri (50% — Bar Chart)*: `Perubahan Admisi Balita & Lansia` (Diferensiasi kerentanan usia balita <5 th vs lansia >60 th pada 5 kelompok paparan P1–P5).
       - *Kanan (50% — Line Chart)*: `Kasus di Sekitar Episode Paparan` (Event study pergerakan kasus hari −3…+7 di sekitar awal episode >P90).
  - Menggunakan layout grid simetris `.health-split-grid` (`repeat(2, minmax(0, 1fr))`) yang otomatis responsif menjadi 1 kolom pada layar $\le 900\text{px}$.
  - Memadatkan seluruh teks catatan kaki di bawah masing-masing grafik menjadi $\le 2$ baris.
- **Validasi**:
  - `bun x tsc --noEmit` lolos 100% tanpa error (`strict: true`).
  - Unit test `tests/*.test.ts` (53/53 pengujian) lolos 100%.
  - `bun run build` sukses membangun bundel produksi `app.js` (554,6 kB) dan `app.css` (67,6 kB).

## 14 November 2026 — Penghapusan teks ringkasan scope di Tab 6 (Intervensi & Rekomendasi)

- **Pembersihan Ringkasan Scope Redundan (`dashboard/src/features/recommendations/view.ts`)**:
  - Menghapus elemen paragraf `scope` (`.policy-scope`) di bagian atas Tab 6 yang menampilkan teks redundan: `27 stasiun · 1 Jan 2024 – 14 Okt 2026 · PM2.5 · VALID · Minimal 18 jam per hari, dengan satuan terverifikasi.`.
  - Informasi status filter dan cakupan data telah terpusat dan konsisten di bilah filter global (`filters panel`) serta catatan spesifik pada panel masing-masing.
- **Validasi**:
  - `bun x tsc --noEmit` lolos 100% tanpa error (`strict: true`).
  - Unit test `tests/*.test.ts` (53/53 pengujian) lolos 100%.
  - `bun run build` sukses membangun bundel produksi `app.js` (554,4 kB) dan `app.css` (67,1 kB).

## 14 November 2026 — Pembaruan teks eyebrow brand PRANA di topbar

- **Pembaruan Teks Eyebrow Brand (`dashboard/src/components/shell.ts`)**:
  - Mengubah teks sub-judul (*eyebrow branding*) pada area header aplikasi (`topbar-title`) dari `PRANA: SISTEM PEMANTAUAN KUALITAS UDARA NASIONAL` menjadi `PRANA: Pollution, Respiratory & Atmospheric Network Analytics`.
  - Tetap mempertahankan judul aplikasi wajib `DA2026_Dashboard_NasiBakarCumiHitamPakKris_AlfinJayadi` secara persis tanpa perubahan.
- **Validasi**:
  - `bun x tsc --noEmit` lolos 100% tanpa error (`strict: true`).
  - Unit test `tests/*.test.ts` (67/67 pengujian di 9 suite test) lolos 100%.
  - `bun run build` sukses membangun bundel produksi `app.js` (554,6 kB) dan `app.css` (67,1 kB).

## 14 November 2026 — Pembaruan teks eyebrow brand PRANA di topbar

- **Pembaruan Teks Eyebrow Brand (`dashboard/src/components/shell.ts`)**:
  - Mengubah teks sub-judul (*eyebrow branding*) pada area header aplikasi (`topbar-title`) dari `PRANA: SISTEM PEMANTAUAN KUALITAS UDARA NASIONAL` menjadi `PRANA: Pollution, Respiratory & Atmospheric Network Analytics`.
  - Tetap mempertahankan judul aplikasi wajib `DA2026_Dashboard_NasiBakarCumiHitamPakKris_AlfinJayadi` secara persis tanpa perubahan.
- **Validasi**:
  - `bun x tsc --noEmit` lolos 100% tanpa error (`strict: true`).
  - Unit test `tests/*.test.ts` (67/67 pengujian di 9 suite test) lolos 100%.
  - `bun run build` sukses membangun bundel produksi `app.js` (554,6 kB) dan `app.css` (67,1 kB).

## 14 November 2026 — Penyesuaian urutan panel Tab 3: Heatmap sebelum Siklus Musiman Bulanan

- **Penyelarasan Hierarki Waktu Tab 3 (`dashboard/src/features/temporal/view.ts`)**:
  - Mengubah urutan tampilan panel sehingga *Polusi menurut Hari & Jam* (Heatmap 7 hari × 24 jam) tampil sebelum *Siklus Musiman Bulanan* (Jan–Des).
  - Menghasilkan alur narasi waktu yang berjenjang dan logis (*progressive temporal zoom-out*):
    1. Dinamika Harian & Deret Waktu (*Profil Diurnal 24 Jam & Tren Harian*)
    2. Dinamika Mingguan (*Heatmap Hari Kerja vs Akhir Pekan*)
    3. Dinamika Tahunan / Musiman (*Siklus Musiman Bulanan Jan–Des*)
    4. Episode Pelampauan Berhari-hari (*Peringkat Durasi Top 10 & Matriks Keparahan*)
- **Validasi**:
  - `bun x tsc --noEmit` lolos 100% tanpa error (`strict: true`).
  - Unit test `tests/*.test.ts` (67/67 pengujian di 9 suite test) lolos 100%.
  - `bun run build` sukses membangun bundel produksi `app.js` (554,6 kB) dan `app.css` (67,1 kB).

## 14 November 2026 — Penambahan visualisasi Siklus Musiman Bulanan dan Matriks Keparahan Episode (Tab 3)

- **Siklus Musiman Bulanan Jan–Des (`dashboard/src/features/temporal/model.ts`, `dashboard/src/features/temporal/charts.ts`, `dashboard/src/features/temporal/view.ts`, `dashboard/styles.css`)**:
  - Menambahkan panel visualisasi baru *Siklus Musiman Bulanan* (Jan–Des) untuk mengisi gap analitis musiman tahunan pada Tab 3 (Pola Waktu).
  - Menyediakan 2 mode interaktif:
    - `Komparasi Antar-Tahun`: garis tren bulanan membandingkan tahun 2024 (biru), 2025 (oranye), dan 2026 (ungu) terhadap acuan baku mutu harian PP 22/2021.
    - `Rentang Gabungan (P25–P75)`: median bulanan gabungan seluruh stasiun pilihan dengan pita rentang interkuartil P25–P75.
  - Memperlihatkan secara jelas lonjakan konsentrasi pada puncak musim kemarau/karhutla (Agustus–Oktober) dibandingkan musim hujan.
- **Matriks Keparahan Episode Ekstrem (`dashboard/src/features/temporal/model.ts`, `dashboard/src/features/temporal/charts.ts`, `dashboard/src/features/temporal/view.ts`, `dashboard/styles.css`)**:
  - Menambahkan scatter plot *Matriks Keparahan: Durasi vs Konsentrasi Puncak* berdampingan dengan *Peringkat Durasi Episode (Top 10)* dalam satu panel terpadu 50:50 (*Episode Pelampauan & Keparahan Ekstrem*).
  - Memetakan setiap episode pelampauan terukur: sumbu X untuk durasi episode (hari beruntun), sumbu Y untuk konsentrasi puncak ($\mu\text{g}/\text{m}^3$), dengan pewarnaan berdasarkan ambang durasi (>30 hari merah, >10 hari oranye, ≤10 hari biru).
  - Tooltip interaktif menampilkan kode stasiun, rentang tanggal kejadian, durasi hari, konsentrasi puncak, dan rata-rata konsentrasi episode.
  - Melengkapi Tab 3 menjadi total 6 visualisasi analitis yang berimbang dengan tab lainnya.
- **Validasi**:
  - `bun x tsc --noEmit` lolos 100% tanpa error (`strict: true`).
  - Unit test `tests/*.test.ts` (67/67 pengujian di 9 suite test, bertambah 2 test baru untuk model musiman dan scatter) lolos 100%.
  - `bun run build` sukses membangun bundel produksi `app.js` (554,6 kB) dan `app.css` (67,1 kB).

## 14 November 2026 — Pembatasan tampilan Durasi Episode Pelampauan menjadi Top 10 (Tab 3)

- **Batasan Episode Pelampauan Top 10 (`dashboard/src/features/temporal/model.ts`, `dashboard/src/features/temporal/view.ts`)**:
  - Mengubah batas maksimum tampilan peringkat episode ekstrem pada grafik *Durasi Episode Pelampauan* (Tab 3: Pola Waktu) dari 15 episode menjadi **Top 10** episode (`limit = 10`).
  - Diterapkan secara seragam pada mode *Per stasiun* (`getLongestEpisodePerStation(data, 10)`) dan mode *Semua episode* (`getTopEpisodes(data, 10)`).
  - Mengurangi tinggi vertikal canvas dari 490px menjadi 350px (`10 baris × 28px + 70px`), menjadikan grafik lebih ringkas, padat, dan mudah dipindai pengguna.
  - Memperbarui teks catatan kaki panel menjadi ringkas maksimal 2 baris: `"Peringkat menampilkan maksimum 10 episode terpanjang dalam rentang pilihan. Bandingkan rata-rata 24 jam (PM2.5/PM10/SO2/NO2) atau maksimum 8 jam (CO/O3) terhadap acuan PP 22/2021. Hari hilang memutus episode."`
- **Validasi**:
  - `bun x tsc --noEmit` lolos 100% tanpa error (`strict: true`).
  - Unit test `tests/*.test.ts` (65/65 pengujian di 9 suite test) lolos 100%.
  - `bun run build` sukses membangun bundel produksi `app.js` (547,0 kB) dan `app.css` (66,7 kB).

## 14 November 2026 — Pengecilan ukuran dan pemadatan komponen legenda seri

- **Kompaktifikasi Legenda Seri (`dashboard/src/shared/series-legend.ts`, `dashboard/styles.css`)**:
  - Menandai disclosure legenda seri dengan kelas `.series-legend-disclosure` dan mengecilkan tombol ringkasannya (*summary*) menjadi `font-size: 11px`, `padding: 3px 0`, serta `margin-top: 10px`.
  - Mengecilkan ukuran tombol item seri pada `.analysis-chart-legend button`: tinggi tombol dipadatkan dari `40px` menjadi `28px`, ukuran font dari `12px` menjadi `11px`, padding menjadi `3px 8px`, dan swatch warna menjadi `7px × 7px`.
  - Menyesuaikan tinggi kartu mawar polusi (`.rose-card`) pada kolom kiri menjadi `314px` agar tetap sejajar (*flush*) dengan batas bawah tombol ringkasan legenda seri yang telah dipadatkan.
- **Validasi**:
  - `bun x tsc --noEmit` lolos 100% tanpa error (`strict: true`).
  - Unit test `tests/*.test.ts` (65/65 pengujian di 9 suite test) lolos 100%.
  - `bun run build` sukses membangun bundel produksi `app.js` (547,2 kB) dan `app.css` (66,7 kB).

## 14 November 2026 — Penyesuaian tinggi kartu arah angin setara legenda seri & penambahan spasi judul (Tab 4)

- **Penyelarasan Kartu Mawar Polusi (`dashboard/styles.css`)**:
  - Menyesuaikan tinggi kartu mawar polusi (`.rose-card`) dari `280px` menjadi `328px`, menyelaraskan batas bawah kartu secara presisi dengan tombol ringkasan disclosure *Legenda seri* di kolom kanan grafik kecepatan angin dispersi (`280px` plot + `16px` margin + `32px` summary).
  - Menambah spasi vertikal (*margin-bottom*) antara nama stasiun/kartu (`.rose-title`) dan canvas chart mawar polusi dari `6px` menjadi `14px`, memberikan pemisah visual yang lega dan nyaman dibaca.
  - Memberikan padding kartu yang lebih seimbang (`padding: 12px 10px 10px`).
- **Validasi**:
  - `bun x tsc --noEmit` lolos 100% tanpa error (`strict: true`).
  - Unit test `tests/*.test.ts` (65/65 pengujian di 9 suite test) lolos 100%.
  - `bun run build` sukses membangun bundel produksi `app.js` (547,1 kB) dan `app.css` (66,3 kB).

## 14 November 2026 — Penggabungan chart angin ke dalam satu panel container tunggal (Tab 4)

- **Unifikasi Panel Dinamika Angin (`dashboard/src/features/drivers/view.ts`, `dashboard/styles.css`)**:
  - Menggabungkan *Arah Angin & Polusi* (Mawar Polusi) dan *Kecepatan Angin & Dispersi per Zonasi* ke dalam satu panel tunggal terpadu (`Arah Angin & Dispersi Polutan`) dengan satu header utama dan kontainer grid 2-kolom (`.wind-dynamics-grid`).
  - Menghilangkan nesting dua kartu `.panel` terpisah yang sebelumnya memicu duplikasi border, header, dan background.
  - Menyelaraskan struktur internal kedua kolom (`.wind-col`): judul sub-seksi (`h4`), toolbar kontrol (`min-height: 42px`), bodi chart (tinggi setara `280px`), dan catatan kaki ringkas yang otomatis terpasang rata di bagian bawah (`margin-top: auto`).
- **Validasi**:
  - `bun x tsc --noEmit` lolos 100% tanpa error (`strict: true`).
  - Unit test `tests/*.test.ts` (65/65 pengujian di 9 suite test) lolos 100%.
  - `bun run build` sukses membangun bundel produksi `app.js` (547,1 kB) dan `app.css` (66,3 kB).

## 14 November 2026 — Pemadatan catatan kaki Tab 4 menjadi maksimal dua baris

- **Penyederhanaan Catatan Kaki Panel Tab 4 (`dashboard/src/features/drivers/view.ts`)**:
  - Memadatkan seluruh teks catatan kaki di bawah grafik pada Tab 4 (*Peringkat Faktor Pemicu*, *Arah Angin & Polusi*, *Angin & Konsentrasi Polutan*, *Lalu Lintas & Jarak Jalan*, dan *Jam Ekstrem*) agar ringkas, padat, dan pas dalam 2 baris teks tanpa mengurangi substansi metodologi atau interpretasi analitis.
  - Khusus pada kontainer baris 50:50 panel angin, teks *Arah Angin & Polusi* dan *Angin & Konsentrasi Polutan* kini sangat ringkas dan simetris, mencegah pergeseran vertikal yang tidak serasi.
- **Validasi**:
  - `bun x tsc --noEmit` lolos 100% tanpa error (`strict: true`).
  - Unit test `tests/*.test.ts` (65/65 pengujian di 9 suite test) lolos 100%.
  - `bun run build` sukses membangun bundel produksi `app.js` (546,9 kB) dan `app.css` (66,3 kB).

## 14 November 2026 — Pemadatan catatan kaki Tab 4 menjadi maksimal dua baris

- **Penyederhanaan Catatan Kaki Panel Tab 4 (`dashboard/src/features/drivers/view.ts`)**:
  - Memadatkan seluruh teks catatan kaki di bawah grafik pada Tab 4 (*Peringkat Faktor Pemicu*, *Arah Angin & Polusi*, *Angin & Konsentrasi Polutan*, *Lalu Lintas & Jarak Jalan*, dan *Jam Ekstrem*) agar ringkas, padat, dan pas dalam 2 baris teks tanpa mengurangi substansi metodologi atau interpretasi analitis.
  - Khusus pada kontainer baris 50:50 panel angin, teks *Arah Angin & Polusi* dan *Angin & Konsentrasi Polutan* kini sangat ringkas dan simetris, mencegah pergeseran vertikal yang tidak serasi.
- **Validasi**:
  - `bun x tsc --noEmit` lolos 100% tanpa error (`strict: true`).
  - Unit test `tests/*.test.ts` (65/65 pengujian di 9 suite test) lolos 100%.
  - `bun run build` sukses membangun bundel produksi `app.js` (546,9 kB) dan `app.css` (66,3 kB).

## 14 November 2026 — Penyetaraan tinggi kartu mawar polusi dan grafik garis angin dispersi (Tab 4)

- **Penyelarasan Tinggi Kartu & Grafik Baris Angin (`dashboard/styles.css`, `dashboard/src/features/drivers/view.ts`)**:
  - Menyamakan tinggi luar kartu sebaran arah angin (`.rose-card`) dengan grafik garis kecepatan angin zonasi (`.wind-bins-plot`) menjadi persis `280px`, selaras dengan tinggi grafik standar lainnya di Tab 4.
  - Menerapkan `display: flex; flex-direction: column; height: 280px;` pada `.rose-card` dan `flex: 1; min-height: 0; height: auto;` pada `.rose-plot` agar kanvas diagram polar mengisi sisa ruang kartu secara fleksibel dan proporsional.
  - Menyamakan `min-height: 42px;` pada toolbar mawar polusi (`.rose-toolbar`) dan margin bawah kontrol mode angin (`windModeGroup` diubah ke `mb-4`) agar titik awal (Y-coordinate) kedua chart sejajar sempurna.
- **Validasi**:
  - `bun x tsc --noEmit` lolos 100% tanpa error (`strict: true`).
  - Unit test `tests/*.test.ts` (65/65 pengujian di 9 suite test) lolos 100%.
  - `bun run build` sukses membangun bundel produksi `app.js` (547,5 kB) dan `app.css` (66,3 kB).

## 14 November 2026 — Penghapusan subjudul jam observasi mawar polusi Tab 4

- **Pembersihan Subjudul Kartu Mawar Polusi (`dashboard/src/features/drivers/charts.ts`, `dashboard/styles.css`)**:
  - Menghapus teks subjudul panjang di bawah judul kode stasiun pada kartu mawar polusi (`<p class="rose-subtitle">... jam observasi angin ≥0,5 m/s</p>`).
  - Nama stasiun lengkap tetap tersimpan secara semantik pada atribut `title` judul stasiun (`heading.title = stationName`) sehingga dapat dibaca saat kursor diarahkan (*hover tooltip*) tanpa mengotori ruang visual kartu.
  - Menghilangkan aturan CSS `.rose-subtitle` dan merapikan margin judul kartu mawar polusi menjadi `margin-bottom: 6px` agar kanvas grafik mawar polusi langsung terpasang rapi, kompak, dan proporsional.
- **Validasi**:
  - `bun x tsc --noEmit` lolos 100% tanpa error (`strict: true`).
  - Unit test `tests/*.test.ts` (65/65 pengujian di 9 suite test) lolos 100%.
  - `bun run build` sukses membangun bundel produksi `app.js` (547,5 kB) dan `app.css` (66,1 kB).

## 14 November 2026 — Penyederhanaan tampilan Arah Angin & Polusi menjadi 2 stasiun default (Tab 4)

- **Default 2 Stasiun Mawar Polusi (`dashboard/src/features/drivers/view.ts`, `dashboard/styles.css`)**:
  - Mengubah jumlah stasiun yang ditampilkan secara bawaan pada panel *Arah Angin & Polusi* dari 3 stasiun menjadi 2 stasiun (stasiun dengan rata-rata konsentrasi tertinggi).
  - Menghapus kontrol dropdown stasiun ketiga (`select3`), menyisakan 2 dropdown pemilihan stasiun (`Stasiun 1` dan `Stasiun 2`) di dalam filter collapsible.
  - Memperbarui subjudul panel menjadi `"Komparasi arah angin pada dua stasiun pilihan · angin ≥0,5 m/s"` dan catatan kaki menjadi `"menyamakan batas radius maksimum kedua grafik"`.
  - Memperbarui grid CSS `.analysis-dashboard .rose-small-multiples` menjadi `grid-template-columns: repeat(2, minmax(0, 1fr))` dengan penyesuaian tinggi plot mawar polusi ke `230px`, menghasilkan tampilan diagram polar yang bulat proporsional dan pas berdampingan dengan panel *Angin & Konsentrasi Polutan* dalam kontainer baris 50:50.
- **Validasi**:
  - `bun x tsc --noEmit` lolos 100% tanpa error (`strict: true`).
  - Unit test `tests/*.test.ts` (65/65 pengujian di 9 suite test) lolos 100%.
  - `bun run build` sukses membangun bundel produksi `app.js` (547,7 kB) dan `app.css` (66,2 kB).

## 14 November 2026 — Penyatuan panel angin Tab 4 dalam satu baris kontainer 50:50

- **Penyatuan Baris Panel Angin (`dashboard/src/features/drivers/view.ts`, `dashboard/styles.css`)**:
  - Menggabungkan panel **Arah Angin & Polusi** dan panel **Angin & Konsentrasi Polutan** ke dalam satu kontainer baris 50:50 (`.drivers-wind-pair` dengan `grid grid-cols-1 lg:grid-cols-2 gap-5`).
  - Menghilangkan kesan panel yang terlalu lebar dan renggang, menciptakan ritme visual yang seimbang: kedua analisis terkait angin (*arah datangnya angin* dan *kecepatan dispersi zonasi*) kini bersanding berdampingan secara tematik.
  - Menyelaraskan proporsi kartu mawar polusi (*small multiples*) dengan ukuran yang lebih proporsional (`grid-template-columns: repeat(auto-fit, minmax(min(100%, 170px), 1fr))`, tinggi plot 210px) dan kurva dispersi angin (tinggi 260px).
  - Menggunakan tata letak `flex flex-col` dengan `margin-top: auto` pada catatan kaki agar tinggi kedua panel simetris dan rapi di desktop serta bertumpuk otomatis pada layar mobile/tablet.
- **Validasi**:
  - `bun x tsc --noEmit` lolos 100% tanpa error (`strict: true`).
  - Unit test `tests/*.test.ts` (65/65 pengujian di 9 suite test) lolos 100%.
  - `bun run build` sukses membangun bundel produksi `app.js` (547,9 kB) dan `app.css` (66,1 kB).

## 14 November 2026 — Penggantian tabel meteorologi dengan grouped bar chart komparatif (Tab 4)

- **Grouped Bar Chart Meteorologi Jam Ekstrem (`dashboard/src/features/drivers/charts.ts`, `dashboard/src/features/drivers/view.ts`, `dashboard/styles.css`)**:
  - Mengganti tabel 5-kolom meteorologi yang kaku dan padat teks pada panel *Karakteristik & Waktu Jam Ekstrem* dengan grafik batang komparasi visual (*grouped bar chart*).
  - Grafik batang membandingkan median parameter meteorologi utama antara **Jam Ekstrem (>P95)** (merah `#ef4444`) dan **Jam Normal (≤P95)** (biru `#0284c7`) untuk tiga parameter kunci: *Kecepatan Angin (m/s)*, *Suhu Udara (°C)*, dan *Kelembapan Relatif (%)*.
  - Menghubungkan grafik secara reaktif ke selektor musim (`Musim Karhutla (Agu–Okt)`, `Luar Karhutla (Nov–Jul)`, dan `Semua Periode`) serta mode ambang P95 global/lokal.
  - Tooltip interaktif menampilkan nilai terukur lengkap dengan satuan serta menghitung otomatis nilai selisih ($\Delta = \text{Ekstrem} - \text{Normal}$) untuk mempertegas fenomena fisik stagnasi angin dan lonjakan kelembapan.
  - Menjadikan tata letak subpanel seimbang dan simetris secara visual (kedua grafik kiri dan kanan memiliki tinggi yang serasi 280px).
- **Validasi**:
  - `bun x tsc --noEmit` lolos 100% tanpa error (`strict: true`).
  - Unit test `tests/*.test.ts` (65/65 pengujian di 9 suite test) lolos 100%.
  - `bun run build` sukses membangun bundel produksi `app.js` (547,8 kB) dan `app.css` (65,8 kB).

## 14 November 2026 — Filter stasiun mawar polusi dibuat collapsible & label kode stasiun disederhanakan

- **Penyederhanaan & Collapsible Filter Mawar Polusi (`dashboard/src/features/drivers/view.ts`)**:
  - Mengubah kontrol pemilihan 3 stasiun mawar polusi (*Arah Angin & Polusi*) menjadi elemen collapsible `<details class="data-disclosure">` dengan ringkasan (*summary*) yang menampilkan kode stasiun yang sedang terpilih (`Pilih stasiun: AQMS-...`).
  - Sesuai kaidah desain repository pada `AGENTS.md`, filter terlipat secara bawaan (*collapsed by default*) dan tetap mempertahankan pilihan saat dibuka/ditutup.
  - Menyederhanakan label pilihan pada ketiga dropdown (`select1`, `select2`, `select3`): hanya menampilkan kode stasiun murni (`opt.textContent = code`, contoh `AQMS-BJB-01`), menghilangkan teks nama panjang dan angka rata-rata yang sebelumnya membuat dropdown terlalu lebar.
  - Mempertahankan tombol toggle *Skala Sama* di samping kanan baris toolbar mawar polusi.
- **Validasi**:
  - `bun x tsc --noEmit` lolos 100% tanpa error (`strict: true`).
  - Unit test `tests/*.test.ts` (65/65 pengujian di 9 suite test) lolos 100%.
  - `bun run build` sukses membangun bundel produksi `app.js` dan `app.css`.

## 14 November 2026 — Catatan kaki Tab 4 (Faktor Pemicu) ditampilkan langsung tanpa details tersembunyi

- **Penyelarasan Tampilan Catatan Kaki Tab 4 (`dashboard/src/features/drivers/view.ts`)**:
  - Mengubah cara membaca pada seluruh panel Tab 4 (Peringkat Faktor Pemicu, Arah Angin & Polusi, Angin & Konsentrasi Polutan, Lalu Lintas & Jarak Jalan, Karakteristik & Waktu Jam Ekstrem) dari elemen disclosure terlipat (`analysisDetails` dengan `<details><summary>Cara membaca</summary>...`) menjadi teks catatan kaki langsung (`element('p', 'panel-footnote', ...)`), menyelaraskan pola desain dengan Tab 3 (Pola Waktu).
  - Teks interpretasi dan penjelasan analitis kini langsung terlihat di bagian bawah tiap panel tanpa memerlukan klik pengguna.
  - Menghapus impor `analysisDetails` yang sudah tidak digunakan di `dashboard/src/features/drivers/view.ts`.
- **Validasi**:
  - `bun x tsc --noEmit` lolos 100% tanpa error (`strict: true`).
  - Unit test `tests/*.test.ts` (65/65 pengujian di 9 suite test) lolos 100%.
  - `bun run build` sukses membangun bundel produksi `app.js` dan `app.css`.

## 13 November 2026 — Penyatuan filter admisi & KPI cards Tab 5 (Dampak Kesehatan)

- **Penyatuan Kontainer Ringkasan Kesehatan (`dashboard/src/features/health/view.ts`, `dashboard/styles.css`)**:
  - Menggabungkan baris filter admisi (`health-toolbar`: pemilih indikator kesehatan + teks orientasi) dan 4 kartu metrik KPI (`health-metrics`) ke dalam satu kontainer panel terpadu (`.health-summary-panel`).
  - Menetapkan **Paparan dan Admisi** sebagai judul kontainer resmi (`<h3>Paparan dan Admisi</h3>`) dengan subjudul *"Telusuri hubungan polutan dengan kasus harian di faskes pilihan."* dan kontrol dropdown *Indikator kesehatan* di sisi kanan header.
  - Menghapus teks cakupan `27 faskes pilihan · 1 Jan 2024 – 14 Okt 2026 · PM2.5 · VALID` dari tampilan visual (dibuat `sr-only` dengan `role="status"` agar aksesibilitas pembaca layar dan penegasan test tetap terpenuhi).
  - Menyusun hierarki visual yang elegan: panel header dengan pemisah garis bawah halus (`border-bottom: 1px solid var(--border)`), kartu-kartu KPI berada di dalam panel-body sebagai sub-kartu berlatar `--surface-secondary`, dan catatan cakupan kelengkapan pasangan berada di bagian bawah.
  - Menyesuaikan penataan responsif mobile pada layar ≤767px agar header dan dropdown bertumpuk rapi.
- **Validasi**:
  - `bun run typecheck` (`tsc --noEmit`) lulus 100% tanpa error (`strict: true`).
  - Unit test `tests/health.test.ts`, `tests/health-age-comparison.test.ts`, `tests/temporal.test.ts`, dan `tests/compliance.test.ts` (32/32 pengujian) lulus 100%.
  - `bun run build` sukses menghasilkan bundel produksi terbarui (`app.js` dan `app.css`).

## 13 November 2026 — Perbaikan visual Donut Kategori ISPU, Segmented Controls, dan Polish Tab 1–3

- **Donut Chart Kategori ISPU Dominan Stasiun (`dashboard/src/shared/charts.ts`)**:
  - Memperbaiki masalah legend duplikat mengambang di atas canvas donut dan angka `26 stasiun` yang terdorong ke atas menabrak cincin dengan menyetel eksplisit `plugins: { legend: { display: false } }`.
  - Donut chart kini kembali terpusat sempurna pada canvas, teks `26 stasiun` berada presisi di tengah lubang donut, dan hanya tabel legend HTML di sebelah kanan yang ditampilkan.
  - Menerapkan `legend: { display: false }` pada `createRankingChart` agar terhindar dari legend liar serupa.
- **Tab 3 Pola Waktu (`dashboard/styles.css`, `dashboard/src/features/temporal/charts.ts`)**:
  - Menambahkan `align-self: flex-start; margin-bottom: 14px;` pada `.temporal-subpanel .segmented-control` sehingga kontrol pilihan mode tidak menabrak batas atas grafik di bawahnya.
  - Memberi border halus `rgba(2, 132, 199, 0.45)` dan `borderWidth: 1` pada swatch legenda dan kurva batas *Rentang P25–P75* pada grafik tren harian dan profil diurnal agar kotak legendanya tidak tampak kosong/transparan di mode terang.
  - Menyelaraskan kontras warna sel heatmap (`cellColor`) dengan meningkatkan opasitas batas bawah (`a = 0.55`) agar sel konsentrasi terendah tampak biru cerah dan selaras dengan swatch biru `#0284c7` pada legenda.
  - Mencegah clipping label badge stasiun pada sumbu Y grafik episode dengan `Math.max(4, endX - totalW)`.
- **Tab 2 Kepatuhan Regulasi (`dashboard/src/features/compliance/view.ts`, `dashboard/styles.css`)**:
  - Memindahkan posisi catatan kaki `annualNote` pada panel *Evaluasi Acuan Tahunan* ke bawah canvas grafik dot plot (sebelumnya terjepit di atas grafik di bawah toolbar).
  - Menyelaraskan dimensi dan sudut dropdown `Tahun evaluasi` (`min-height: 36px; padding: 6px 10px; border-radius: 8px;`) agar seimbang dengan segmented control `Top 10 | Seluruh stasiun` di sampingnya.
- **Tab 1 Ikhtisar Nasional (`dashboard/src/features/overview/view.ts`)**:
  - Menghapus label `· Dataset sintetis` dari footer Ikhtisar Nasional sesuai aturan panduan komite pada `AGENTS.md`.
- **Validasi**:
  - `bun run typecheck` (`tsc --noEmit`) lulus 100% tanpa error (`strict: true`).
  - Unit test `tests/temporal.test.ts`, `tests/compliance.test.ts`, `tests/health.test.ts`, dan `tests/policy.test.ts` (38/38 pengujian) lulus 100%.
  - `bun run build` sukses menghasilkan bundel produksi terbarui (`app.js` dan `app.css`).

## 13 November 2026 — Modernisasi & upgrade analitis Tab 4 Faktor Pemicu

- **Ringkasan Faktor Pemicu (4 KPI Cards)**:
  - Menambahkan segmented toggle `[Ambang Global (P95)]` vs `[Ambang per Stasiun (P95)]` pada toolbar ringkasan.
  - Mengatasi bias analitis dari persentil 95 gabungan: ambang pooled P95 (103,7 µg/m³) secara artifisial mengonsentrasikan jam ekstrem pada stasiun gambut/hotspot karhutla (pangsa karhutla 84,36%). Mode ambang per stasiun mengevaluasi 5% jam tertinggi masing-masing lokasi, membuktikan bahwa 73,81% jam ekstrem lokal terkonsentrasi pada Agustus–Oktober serta mengungkap kondisi stagnasi lokal di seluruh 27 stasiun.
  - Menghubungkan pilihan mode ambang secara reaktif ke tabel kondisi meteorologi dan kurva probabilitas diurnal ekstrem.
- **Peringkat Faktor Pemicu PM2.5 (Pengganti Baris Korelasi Tunggal)**:
  - Menggantikan baris korelasi tunggal dengan grafik batang horizontal *driver ranking* yang menunjukkan proporsi varians PM2.5 harian yang dijelaskan oleh masing-masing faktor.
  - Menghitung $\eta^2$ (Eta squared) untuk faktor kategorikal: Stasiun (16,8%), Tipe Lokasi (15,4%), Musim Karhutla (10,4%), dan Jam Hari Diurnal (0,5%).
  - Menghitung $R^2$ untuk faktor meteorologi kontinu harian: Kecepatan Angin (2,7%, korelasi negatif $r = -0,165$), Suhu Udara (2,7%, $r = +0,163$), dan Kelembapan Relatif (0,2%, $r = +0,046$).
  - Mempertahankan matriks korelasi Spearman lengkap (suhu, lembap, angin) dalam pengungkapan `<details>` terlipat dengan selektor musim (`Semua`, `Agu–Okt`, `Nov–Jul`).
- **Arah Angin & Polusi (Pollution Rose)**:
  - Menambahkan kontrol pemilihan 3 stasiun interaktif (bawaan: 3 stasiun dengan rata-rata konsentrasi polutan tertinggi dalam filter aktif).
  - Menambahkan tombol toggle `Skala Sama` untuk menyamakan batas skala radius radial ($r_{\max}$) pada ketiga mawar polusi sehingga perbandingan magnitudo visual menjadi presisi.
  - Menampilkan jumlah jam observasi valid ($n$) pada subjudul setiap kartu mawar polusi (`n = X.XXX jam observasi angin ≥0,5 m/s`).
  - Menyembunyikan sektor arah angin dengan data tidak mencukupi ($<5$ jam observasi) untuk mencegah artefak akibat sedikit sampel.
- **Angin & Konsentrasi Polutan**:
  - Mengganti puluhan garis stasiun bertumpuk dengan 1 garis per `site_type` (zonasi: Urban Background, Traffic / Roadside, Peatland Boundary, Industrial Perimeter, Regional / Clean Background, Urban Coastal Background).
  - Menambahkan toggle `Ternormalisasi (Rasio)` vs `Konsentrasi Absolut`: mode ternormalisasi membagi konsentrasi tiap kelompok kecepatan angin terhadap median tipe lokasi tersebut (1,0 = median normal) sehingga kemiringan dispersi atmosfer dapat dibandingkan langsung lintas baseline yang berbeda.
  - Mengabaikan kelompok kecepatan angin dengan $<5$ jam observasi dan mencantumkan $n$ jam pada tooltip.
- **Lalu Lintas, Jarak Jalan & Konsentrasi Polutan Primer**:
  - Mengalihkan sumbu y polutan bawaan ke NO2 dengan selektor interaktif `[NO2] [CO] [PM2.5]` untuk mengamati polutan primer lalu lintas yang tidak terdominasi asap karhutla.
  - Menambahkan garis tren regresi linier dengan koefisien korelasi Pearson $r$ dan jumlah stasiun $n$ pada setiap grafik scatter.
  - Menambahkan toggle `Tanpa Musim Karhutla (Nov–Jul)` vs `Semua Bulan` untuk mengisolasi periode non-karhutla.
  - Menambahkan scatter plot kedua berdampingan untuk `distance_to_road_m` (meter), menunjukkan korelasi negatif pengenceran polutan terhadap jarak ke jalan raya ($r = -0,32$ hingga $-0,53$).
- **Kondisi saat Polusi Ekstrem & Waktu Terjadinya Jam Ekstrem**:
  - Menggantikan grafik batang sumbu 0–100 gabungan dengan tabel komparasi meteorologi terstruktur: Kecepatan Angin (m/s), Kelembapan (%), Suhu (°C), dan Median Jam Kejadian (WIB) antara jam ekstrem (>P95) vs normal (≤P95) disertai nilai selisih ($\Delta$).
  - Menyediakan switcher musim: `Musim Karhutla (Agu–Okt)`, `Luar Karhutla (Nov–Jul)`, dan `Semua Periode`.
  - Mengonversi jumlah kejadian mentah pada grafik waktu ekstrem menjadi kurva probabilitas kondisional $P(\text{Ekstrem} \mid \text{Jam } h)$ per jam hari (00–23 WIB) dengan dua garis komparasi (Musim Karhutla dengan puncak pagi 07:00 WIB 22,4% & sore 18:00 WIB 20,2% vs Bulan Lainnya flat ~1,0%).
- **Validasi**:
  - `bun x tsc --noEmit` lolos 100% tanpa error (`strict: true`, `noUncheckedIndexedAccess: true`).
  - Unit test `tests/drivers.test.ts` (8 pengujian terpadu) lolos 100%, memverifikasi eta², R², kuantil P95 global vs lokal, metrik lalu lintas/jarak jalan, dan normalisasi angin.
  - Suite unit test `tests/*.test.ts` (46 pengujian pada 6 modul pengujian inti) lolos 100%.
  - `bun run build` sukses membangun bundel produksi `app.js` (547 kB) dan `app.css` (65,8 kB) dalam 428ms.

## 13 November 2026 — Penyatuan kontainer panel & pemendekan catatan kaki tren harian (Tab 3 Pola Waktu)

- **Penyatuan Kontainer & Catatan Kaki 2 Baris (`dashboard/src/features/temporal/`)**:
  - Menggabungkan visualisasi ke dalam satu panel terpadu dengan judul kontainer resmi: **Profil Polusi & Tren Harian** (*"Siklus diurnal per jam (00–23 WIB) dan deret waktu harian stasiun pilihan"*), yang otomatis terbarui sesuai polutan aktif.
  - Membagi kontainer menjadi dua subpanel 50:50 dengan judul subpanel masing-masing (**Profil Polusi per Jam** dan **Tren Harian Stasiun**) yang dipisahkan oleh batas vertikal elegan (`border-right`) pada desktop dan bertumpuk otomatis pada layar ≤1000px.
  - Memberikan jarak vertikal yang lebih lega (~32px) antara subjudul kontainer utama dan judul subpanel grafik agar hierarki visual lebih bernapas dan jelas.
  - Mempersingkat teks catatan kaki tren harian agregat menjadi tepat 2 baris:
    *"Garis biru: median harian stasiun pilihan; area arsir: rentang P25–P75. Garis putus merah menandai acuan 24 jam PP 22/2021."*
  - Menyelaraskan catatan kaki subpanel profil diurnal ke format 2 baris agar tinggi kedua sisi simetris dan rapi.
- **Tren Harian Stasiun & Mode Agregat (`dashboard/src/features/temporal/`)**:
  - Menyelesaikan masalah *spaghetti chart* (27 garis stasiun bertumpuk) dengan memperkenalkan mode **Rata-rata gabungan** sebagai tampilan bawaan (*default*).
  - Mode agregat menampilkan kurva median harian yang halus (`#0284c7`) bersama pita area interkuartil (P25–P75) lintas stasiun dan garis acuan regulasi PP 22/2021 (harian & tahunan jika ada).
  - Menambahkan segmented control `[Rata-rata gabungan] [Per stasiun]` di atas grafik dengan kontrol tersinkronisasi. Mode "Per stasiun" mempertahankan kemampuan investigasi detail per stasiun dengan *series legend* yang dapat dibuka/tutup.
  - Implementasi fungsi matematis `computeDailyStationAggregate` pada `model.ts` untuk menghitung kuantil harian (median, P25, P75), rerata, dan jumlah stasiun aktif dengan penanganan data parsial/hilang yang ketat.
  - Menambahkan metode `setVisible` pada `seriesLegend` (`dashboard/src/shared/series-legend.ts`) agar legenda pengungkapan stasiun dapat disembunyikan secara bersih dalam mode agregat dan kembali aktif dalam mode per stasiun.
- **Validasi**:
  - `bun x tsc --noEmit` lulus 100% tanpa error (`strict: true`).
  - Unit test `tests/temporal.test.ts` (8 pengujian) lulus 100%, termasuk uji kuantil dan penanganan stasiun hilang.
  - `bun run build` sukses menghasilkan bundel produksi terbarui (`app.js` dan `app.css`).

## 13 November 2026 — Make Tab 5 dose and episode charts readable after user review

- User judged the outcome selector and the two second-row Tab 5 charts unclear and asked for a data-grounded rethink against visualization best practice. Audit of the default selection: the equal-width dose bins held 23,924 / 281 / 3 / 26 / 2 facility-days (98.7% in bin 1; two bins from single facilities), and the episode chart's raw-count axis (~31–33) hid a real +10.0% step on day 0 versus the −3:−1 baseline across 361 episodes.
- Dose chart (`Kasus Menurut Tingkat Paparan`): five equal-count exposure quintiles of the selected pairs; bars now show per-facility percent change against that facility's own mean over the same selection, equally averaged; x labels are quintile exposure ranges; tooltips keep raw quintile mean cases, range, facility and pair counts. `ExposureBin` type reworked (`change`/`facilities`/`cases` replace `mean`/`admissions`).
- Episode chart: plots the existing percent-change series on a zero-inclusive y range (new optional per-update range in `healthPlot`), raw cases move to tooltips; captions for both charts shrink to one line each, definitions stay in methodology.
- The outcome selector is kept (all seven outcomes remain complete in the data, CV 0.5–0.8); its four responding panels now use readable units, so switching indicator visibly changes the story. Methodology, design.md decision log, and CASE_TAB_5_6_AUDIT.md synchronized; chart form chosen per Financial Times visual-vocabulary practice (github.com/Financial-Times/chart-doctor).
- Validation: `tsc --noEmit` clean, all 64 unit tests pass (bin pair-partition and episode-fixture assertions unchanged), strict production build passes, and the full browser suite passes 84/84.
- Limits: dose quintiles and episode changes remain descriptive; facility-size and seasonal confounding are acknowledged in captions/methodology, not adjusted away.

## 13 November 2026 — Remove Tab 6 PM2.5 lag simulator after user review

- Removed the `Simulasi PM2.5 dan Admisi` panel from `Rekomendasi Kebijakan` after the user judged it useless: its no-extrapolation domain is the intersection of all modeled facilities' training exposure and collapsed to ~2 µg/m³ at full-network selection, producing a flat curve.
- Deleted the whole fitted-model chain with the panel: `features/recommendations/lag-simulator.ts`, `shared/confidence-chart.ts`, `shared/lag-model.ts` (validators moved to new `shared/parse.ts`), `scripts/export-case-model.py`, `scripts/requirements-analysis.txt`, `model_coef.json` (dataset/dashboard and dashboard/data), `dataset/processed/model_validation.json`, and the `data:case-model` npm script. The case-study brief had listed this simulator; its removal is an explicit user override (recorded in design.md).
- `network_rank.json` generation moved into `scripts/export-policy.py` and regenerates byte-identical output (md5 unchanged); `npm run data:policy` prints the new `network_rank.json` line.
- Updated methodology sections (removed model/simulator paragraphs, reworded manual-capacity and traceability entries), Tab 6 filter-scope copy, `.case-model-*` styles, README reproduction steps, and CASE_TAB_5_6_AUDIT.md (removal note plus corrected pre-normalization "3 ppm unavailable" claim). Tab 5 reviewed; all six panels are brief-mandated and functional, unchanged.
- Validation: `tsc --noEmit` clean, all 64 unit tests pass, strict production build passes, and the full browser suite passes 84/84 on the Vite development server with the production preview build synced. Browser expectations updated for the 5-heading panel order, 3 policy canvases, and several merge leftovers in `dashboard.spec.ts`/`ticker.spec.ts` verified against the source (doughnut 26 measured stations; exceedance 16,58 from the client recalculation; hospital KPI 6,43 global and 2,44 after selecting AQMS-BJB-01, which is that facility's own burden as design.md requires; current map popup/legend copy; IKU panel heading; temporal/driver containers; map-legend column alignment polled past the `panel-enter` entrance animation). One `development.spec.ts` CSS-edit check flaked once under full-suite load and passed in isolation and in the final 84/84 run.
- Limits: the PM2.5 response matrix and manual capacity calculator remain observational/planning aids, not predictions; the brief's simulator item is no longer implemented. The overview export's `kpi` block (17,7 / 6,43 full-scope) is not what the dashboard renders: the UI recalculates from `daily_cube` per the design contract, leaving the notebook's `kpi` values unreconciled — reported here as an open pipeline discrepancy, not silently changed.

## 13 November 2026 — Reorder policy tab so actions close the evidence

- Moved `Prioritas Tindakan` from the first to the last panel of `Rekomendasi Kebijakan` after the user judged a text-only synthesis odd when leading a visual-first dashboard. New order: `Matriks Respons Kesehatan`, `Simulasi PM2.5 dan Admisi`, `Asumsi Kapasitas Manual`, `Prioritas Studi Ekspansi AQMS`, `Lokasi dan Bukti`, `Prioritas Tindakan`. Card content, candidate selection, and honest wording are unchanged; this supersedes the earlier action-first ordering.
- Affected `features/recommendations/view.ts`, the focused browser heading-order assertion, and design.md. No calculations, exports, styling, or other tabs changed.
- Validation: strict production build passed and the focused policy browser checks passed. Full-suite status is unchanged from the earlier same-day entry. No commit or push.

## 13 November 2026 — Align health and policy tabs with the case-study brief

- Applied CASE_STUDY_CONTEXT.md to Tabs 5/6 following the user's explicit choice to restore persistent global filters and an evidence-based response matrix. This supersedes the independent policy-region lookup and fixed policy observation scope above. Preserved the exact title, official branding, overview inventory, canonical routes, Vite/Tailwind workflow, collapsed filter defaults, anonymous hospital identities, and plain-language copy.
- Tab 5 adds fixed-reference age/diagnosis comparisons, peak-lag emphasis, a complete non-overlapping episode chart (observed mean cases at days −3:+7, with relative changes in tooltips), and respiratory+CVD admission-pressure time series. Baseline comparisons use per-facility 2024 P25/P75 references with minimum pair counts and positive denominators; PPOK/CVD remain all-age outcomes. Episode definitions, required coverage, and the distinction between admission records, unique patients and occupancy are visible and documented. Shortened narrow-screen date ticks while retaining full tooltip dates; verified all four age/diagnosis axis labels are actually painted.
- Tab 6 retains evidence/actions and separate manual capacity assumptions, adding a historical PM2.5 response matrix, a fitted PM2.5 distributed-lag simulator with conditional-mean confidence bands, temporal model evaluation, interactive expansion weights, and explicitly hypothetical radius rings. Global facility/date/pollutant/QC filters affect supported observations and manual planning. The PM2.5 model has explicit training-reference profiles; date changes do not pretend to retrain it. Expansion scores use source master baseline, traffic and full-network nearest-neighbor separation, without invented new sensor coordinates or population-coverage claims.
- Added scripts/export-case-model.py and pinned Python analysis requirements. Fitted separate under-5/over-60 Poisson models in both QC modes, with lag 0–7, weather, weekday, hospital fixed effects, season and time, plus hospital-clustered covariance. Trained only 2024–2025, tested on all eligible 2026 observations against a same-controls/no-PM comparator. Full evaluation reveals severe failure on out-of-training-range 2026 episodes; those rows and errors remain reported. Interactive scenarios are restricted to the intersection of each modeled facility's training exposure support. Conditional mean intervals use the gradient of summed predictions and full covariance; numerical overflow is unavailable rather than Infinity.
- Extended scripts/export-health.py with health_lag.json (20,854 bytes) and runtime agreement checks against daily exposure. Added model_coef.json (208,198 bytes), network_rank.json (2,927 bytes), and an independent NumPy reference audit in dataset/processed/model_validation.json. Dataset/dashboard, dashboard/data and production mirrors are identical; each browser export remains below 2 MB. All 33 raw-source hashes match the original provenance, and existing health outcome/exposure measurements are unchanged.
- Affected health feature types/loading/model/charts/view plus new insights/response modules; recommendations filter lifecycle/model/planning/map/view plus new model/network/response components; shared lag-model/confidence-chart modules; shell/main wiring; Tailwind-backed styles; analytical scripts/exports; focused tests; methodology, README, design.md and CASE_TAB_5_6_AUDIT.md. Removed obsolete local policy-filter styling. Partial failures have isolated retry and chart cleanup. Fixed a browser-detected desktop-to-phone chart overflow with constrained grid tracks and minimum widths, without hiding page overflow.
- Validation: strict production build, all 40 model/data tests, independent raw-CSV admission audit, 24 NumPy/browser prediction-and-covariance comparisons, and git diff --check passed. All 28 focused development browser checks passed, including actual TypeScript/CSS/HTML/export/route live updates. Production repeated the feature/route checks with 22 passes and six development-only skips. Final focused development/production rechecks passed after episode-count display, finite-interval and axis-spacing refinements; a canvas-text assertion verifies all age labels at 320–1440px. Reviewed light/dark desktop and phone screenshots. Checks cover global selections across tabs, sparse data, exact capacity arithmetic, bounded model inputs/intervals, zero weights, matrix evidence, retries, map keyboard access, repeated teardown, real animation and live reduced motion.
- Limits: model results are bounded exploratory associations and fail extreme 2026 extrapolation, not validated clinical warnings or causal policy benefits. Radius circles are assumptions, existing points are areas for siting studies, and optional station-redundancy modeling is not implemented. Basemap requests were blocked during browser checks; points/table and failure messaging were verified. The unrelated full browser suite and exhaustive assistive-technology/heap audits were not run. Preserved unrelated user changes/deletions. No commit or push.

## 12 November 2026 — Restore simulation alongside policy recommendations

- Corrected the misunderstood relocation following the user's explicit clarification. `Rekomendasi Kebijakan` now presents `Prioritas Tindakan`, a visible `Simulasi Kapasitas Layanan`, then `Lokasi dan Bukti`. Removed the health planning disclosure, aggregation module, and unused disclosure styling. Kept the simple independent region lookup, collapsed station table, and action evidence; did not restore the readiness ladder, analytical filters, or pagination.
- Recommendations/planning.ts now aggregates recorded general respiratory admissions for the selected policy region over the fixed exported calendar, requiring complete facility coverage per included day before mean/P90. The existing shared simulator retains exact formulas, constraints, reset, invalid/unavailable states, and comparison charts. Region changes update recorded capacity/baseline while preserving assumptions. Other tabs' analytical filters remain independent. Policy chart initialization waits for the PRANA opening, updates reuse instances, and teardown destroys them.
- Updated recommendations/view.ts and index.ts, main.ts, health/view.ts, Tailwind styling, focused model/browser checks, generated bundles, methodology, README, POLICY_TAB_REVIEW.md, and design.md. All 33 raw-source hashes remain unchanged; no dataset/export measurements changed. This entry supersedes the preceding simulator-placement decision while preserving its history.
- Validation: strict production build, all 32 model/data tests including the raw-CSV audit, and git diff --check passed. All 21 initial development health/policy/simulator browser checks passed. After the opening lifecycle adjustment, all 22 production checks and six focused development simulator checks passed, including exact zero/+25%/+100-bed calculations, P90 aggregation, invalid inputs, region scope/input preservation, ordered visible sections, no simulator in health, actual animation after the opening, repeated teardown, both themes, and responsive layouts. Reviewed desktop policy layout and phone/desktop controls.
- Limits: basemap network requests were blocked during browser checks; marker/table fallback remained usable. The unrelated full browser suite was not rerun. No causal policy effects or bed-occupancy forecast were added. No commit or push.

## 12 November 2026 — Lead policy recommendations with actions and relocate optional planning

- Applied the user-approved POLICY_TAB_REVIEW.md revision. Replaced the percentile ladder/KPIs and policy simulator with `Prioritas Tindakan`: data-derived locations, evidence, first steps, and follow-up measures for instrument/telemetry review, monitoring continuity, unit verification, respiratory-service review, and monitoring-location studies. Service and network candidates are transparent within-region comparisons, not validated intervention thresholds or demonstrated policy effects.
- Replaced shared analytical filtering on this tab with one independent, collapsed searchable region lookup. Policy always uses the full exported calendar (1 January 2024–14 October 2026), VALID daily observations, and all six pollutants for complete-day counts. Analytical station/site/date/pollutant/QC selections remain preserved for overview/health. Policy loading no longer requires the overview measurement export. The supporting full-network map and collapsed sortable table retain all matching rows, keyboard interaction, source statuses, and globally calculated nearest-neighbor distances, without pagination.
- Moved `Simulator Beban Admisi` below health analyses into a closed-by-default optional planning disclosure. Shared typed admissions modules own its controls, charts and formulas; health computes the baseline from same-day summed general respiratory admissions for selected facilities/dates. Opening initializes charts once; closing/reopening retains assumptions; filter changes update the baseline; teardown destroys owned resources. Outcome, pollutant and QC do not rewrite general respiratory counts. Removed obsolete policy chart/simulator modules and percentile calculations/reference fields; regenerated schema-version-2 policy context (303,886 bytes) with no version-1 fallback.
- Affected: recommendations feature modules, health/view.ts and planning.ts, shared/admissions modules, main.ts, methodology, Tailwind-backed dashboard/styles.css, scripts/export-policy.py, generated policy JSON/bundles, focused tests, README, design.md, and both policy-review/plan documents. All 33 raw-source hashes remain unchanged; analytical source files were preserved. Dataset/browser/production policy exports are identical.
- Validation: strict production build, all 32 model/data tests (including the raw-CSV audit), and git diff --check passed. All 21 focused development health/policy/simulator browser checks passed; production repeated those checks plus canonical-route/asset/refresh coverage with 22 passes and six development-only skips. Seven additional development checks passed for every route and actual TypeScript, Tailwind, HTML, export and route-registry live updates. Browser coverage includes exact zero/+25%/+100-bed arithmetic, P90 after daily aggregation, invalid assumptions, date/facility selection, lookup cancellation and independence, sort/disclosure persistence, retry, pending-request navigation, repeated resource teardown, real chart motion, themes, and 320–1440px layouts. Reviewed desktop/phone policy views and simulator controls in light/dark themes.
- Limits: basemap network requests were blocked during browser checks; source markers, fallback messaging and table remained usable. The unrelated full browser suite was not rerun. No causal policy effects, occupancy, procurement coordinates or intervention costs were estimated. No commit or push.

## 12 November 2026 — Use plain-language interface copy and document policy review

- Removed decorative arrow separators from health orientation/comparison captions and policy evidence text in the feature views; rebuilt the generated bundle. Added the wording preference to AGENTS.md and design.md. Calculations and controls are unchanged.
- Created POLICY_TAB_REVIEW.md with a proposed action-first revision after the user's feedback about analytical filters and Tangga Kesiapsiagaan. Section replacement, filter changes, and simulator relocation remain proposals for review; they have not been implemented.
- Validation: strict production build, all 31 model/data tests, three focused health/policy browser checks, and git diff --check passed. Source search found no remaining arrow separators in dashboard/src or the source HTML. No full browser-suite rerun, commit, or push.

## 12 November 2026 — Remove unnecessary policy pagination

- Applied the user's clarification that pagination is unnecessary for the small station set and inconsistent with the other tabs. Readiness now shows all comparable selected stations; the collapsed evidence table contains all matching rows. Sorting, filtering, disclosure state, and scenario calculations remain intact.
- Removed page slicing/state, page counters, previous/next controls, their handlers, and unused pager CSS from `features/recommendations/view.ts` and `dashboard/styles.css`; rebuilt bundles and updated the focused browser assertions/design contract. Prior pagination decisions remain above/below as historical entries, superseded by this change.
- Validation: strict build and all 31 model/data checks passed. All 11 policy browser checks passed in development; three focused production checks passed for full station visibility, sorting, and disclosure preservation. Verified 22 comparable chart stations and all 27 table rows at full scope, reducing to three after Jakarta selection, with no previous/next controls retained in the DOM. Reviewed the updated desktop dark capture; responsive/animation and scenario checks passed. Broader baseline overview failures were not retested. No commit or push.

## 12 November 2026 — Hide unavailable policy pagination directions

- Changed readiness-chart and station-table pagination to hide previous/next controls when their corresponding page does not exist. Both controls disappear for a single-page selection; paging/counts, sorting, and disclosure state remain intact. Move focus to the remaining direction when the clicked control disappears at a boundary. These controls browse station evidence and are not simulation steps.
- Affected: `features/recommendations/view.ts`, rebuilt `dashboard/app.js`, focused policy browser checks, and `design.md`. No scenario formula, dataset, or styling changes.
- Validation: strict build and all 31 model/data tests passed. Four focused development browser checks passed (scenario output, table sorting, disclosure preservation/control layout, and first/last/single-page visibility plus keyboard focus). The pagination-boundary check also passed in production preview. Broader previously documented overview failures were not changed or retested. No commit or push.

## 12 November 2026 — Collapse policy table and align scenario controls

- Wrapped the station sort controls, evidence table, and pagination in a native `Data stasiun` disclosure, collapsed by default with the selected station count and SVG chevron visible. Kept the map outside it. Keyboard opening works, closing/reopening preserves the sort/page, and filter changes preserve the disclosure state while updating its count and rows. Added a 260ms expansion where supported and an immediate reduced-motion state.
- Removed the duplicated percentage slider and its event listeners/styles. The simulator now has one numeric input per assumption, 44px baseline buttons/inputs/reset, and wrapping based on the panel's actual container width. This fixes the uneven grid caused by the taller slider field and padded segmented control. Kept the full scenario domain/validation/math unchanged.
- Affected: `features/recommendations/view.ts`, `simulation.ts`, `dashboard/styles.css`, rebuilt `dashboard/app.js`/`app.css`, focused browser assertions/screenshots, and `design.md`. No dataset, pipeline, admission formula, or global-filter changes.
- Validation: strict build/type checks and all 31 model/data tests passed; all 10 policy browser checks passed in both Vite development and production preview. Browser geometry measured equal 44px control heights/alignment, verified no overflow, keyboard disclosure, retained sorting/pagination, refreshed counts after filtering, exact scenario outputs, invalid-input recovery, route cleanup, and motion behavior. Reviewed desktop/tablet/phone dark control captures and the responsive full-page captures. The complete broader suite was not rerun for this scoped UI correction; previously documented overview failures remain unchanged. No commit or push.

## 12 November 2026 — Implement policy readiness, admissions scenarios, and AQMS review

- Implemented the user-approved POLICY_IMPLEMENTATION_PLAN.md in `Rekomendasi Kebijakan`, replacing the unavailable placeholder and unsupported cost-benefit/mortality/DLM promises with the approved evidence-and-readiness research question. Preserved the exact application heading/title, official branding, current overview/health behavior, Vite, Tailwind, and canonical routes. No automatic commit/push was carried forward from the previous Git task.
- Added four scoped indicators, paginated historical P75/P90 stacked bars against fixed calendar-2024 station/pollutant/QC baselines, concise evidence/action cards, the interactive admission-load scenario, and a full-width installed-station map with sortable/paginated source evidence. Shared filters now work on this tab without duplicate controls. Missing units/sparse periods remain uncomparable, while available health summaries/scenarios remain usable.
- Added `scripts/export-policy.py` and `npm run data:policy`. The exporter verifies all existing health-export raw source hashes, retains general respiratory admissions and recorded bed capacity, derives linear-interpolated fixed references, joins station/sensor context, counts in-window recorded/excluded-QC rows, and calculates nearest-neighbor Haversine distances against the full installed network. Mirrored `policy_context.json` payloads are 319,959 bytes under `dataset/dashboard/` and `dashboard/data/`. No source dataset or existing analytical export changed.
- Simulator calculations use full precision: baseline = mean or P90 of same-day summed selected-facility general respiratory admissions; scenario admissions = baseline × (1 + assumed increase/100); scenario capacity = recorded capacity + additional assumed beds; relative load = scenario admissions/capacity ×100. Zero inputs reproduce the historical baseline exactly. Added beds do not change admissions. Inputs are bounded finite 0–200% increases and integer 0–100,000 additional beds; blank/invalid inputs clear outputs/charts instead of retaining stale values. Missing capacity/data is unavailable, while real zero admissions remain zero. These are explicit planning assumptions, not occupancy, causal effects, or a fitted forecast.
- Added strict runtime validation for calendars, counts, units, unique hospital/station relations, baseline-reference agreement with the public daily exposure export, QC denominators, and nearest-neighbor agreement with all installed coordinates. Feature-owned modules separate model, loading/cache, presentation, chart/map lifecycle, and scenario inputs. Pending/sibling fetches abort correctly; charts/maps are reused on updates and destroyed on teardown. Fixed keyboard marker initialization and an observed phone-to-desktop SVG clipping issue by refreshing renderer bounds without moving the map view. Basemap failures retain points/list and announce one concise status.
- Updated source shell/main wiring, health/policy methodology, source Tailwind styling, the existing all-tabs navigation expectation, README.md, design.md, and the approved plan status. Rebuilt the static bundle. New tests are in `tests/policy.test.ts` and `tests/browser/policy.spec.ts`. The raw-CSV audit test explicitly skips with a reason when ignored committee files are absent from a clone; all raw audit checks ran in this workspace with no skips.
- Validation: strict Node 24 production build and all 31 model/data tests passed. Independent raw-CSV checks matched all 27 facility admission series and all 1,018 aggregate daily totals, including total 733,191 and mean 733,191/1,018. Tested P90 after aggregation (not summed facility percentiles), zero/reset identity, both baseline choices, monotonic scenario arithmetic, fractional/invalid inputs, all six pollutant/two-QC independence, fixed historical references, empty/missing data, and invariant full-network distances.
- Browser verification: full Vite development suite passed 57/59, retaining only the same two previously documented overview data-expectation failures. All nine policy tests passed, including actual full-precision output changes, invalid-input recovery, retained assumptions, shared selections, sparse exposure, global network reference, sorting/pagination, keyboard map inspection, retry, pending-load navigation, visible canvas animation, live reduced motion, repeated mounting, and responsive fit. After final map error/resize cleanup, the two focused map/geometry checks passed. Final production map/responsive checks also passed with measured ≥44px zoom targets and phone-to-desktop vector bounds. Production preview passed all 18 applicable route/health/policy checks; six development-only checks were intentionally skipped. Reviewed desktop dark/phone dark and the corrected map crop; captures cover 320/375/768/1024/1440px and both themes, with no page-level horizontal overflow.
- Limits: readiness percentiles/minimum sample counts are a declared comparison convention, not official warning thresholds or statistical confidence guarantees. Network separation is not population coverage, optimized siting, or a travel distance. Input bounds are UI bounds, not measured intervention effects. No fitted DLM, mortality-benefit estimate, monetary ranking, occupancy estimate, or exhaustive assistive-technology/heap audit is claimed. Existing overview expectation failures remain outside this feature. No commit or push performed.

## 12 November 2026 — Perbaikan pemuatan Faktor Pemicu & penyempurnaan visual Pola Waktu

- **Faktor Pemicu (Tab 2)**:
  - Memperbaiki kegagalan pemuatan `tab4_drivers.json` di [load.ts](file:///d:/Projects/Gelarrasa/dashboard/src/features/drivers/load.ts) yang disebabkan oleh stasiun berskala logger belum terverifikasi (`AQMS-BJB-01`, `MDN-01`, `PSW-01`) dengan nilai `null` pada `mean_no2` dan `mean_co`. Tipe data dan parser diperbarui untuk mendukung `number | null`, dan scatter plot memfilter titik null dengan aman.
  - Mendaftarkan modul `Legend` dari Chart.js pada [charts.ts](file:///d:/Projects/Gelarrasa/dashboard/src/features/drivers/charts.ts) sehingga label legenda pada scatter dan plot lainnya tampil sempurna.
- **Pola Waktu (Tab 1)**:
  - Mendaftarkan modul `Legend` Chart.js pada [charts.ts](file:///d:/Projects/Gelarrasa/dashboard/src/features/temporal/charts.ts) sehingga legenda pada seluruh grafik diurnal, deret waktu, dan episode ekstrem kini tampil lengkap dan jelas.
  - Memperbarui `host.replaceChildren(root)` pada [view.ts](file:///d:/Projects/Gelarrasa/dashboard/src/features/temporal/view.ts) sebelum inisialisasi instance grafik agar Chart.js dapat mengukur dimensi kanvas pada DOM aktif secara akurat.
  - Grafik Diurnal: menambahkan overlay komparasi 4 kurva langsung (Hotspot Karhutla vs DKI Jakarta pada musim kebakaran Agu–Okt dan bulan lainnya), serta selector zonasi langsung di panel.
  - Heatmap: menambahkan selector stasiun langsung di atas kanvas matriks untuk navigasi cepat dan membuat kanvas responsif menyesuaikan lebar kontainer.
  - Deret Waktu: menambahkan tombol toggle "Fokus Baku Mutu (0–150 µg/m³)" vs "Skala Penuh" agar garis batas PP 22/2021 (55 µg/m³ dan 15 µg/m³) tidak terhimpit oleh lonjakan ekstrem ~1,127 µg/m³ kebakaran gambut.
  - Episode Ekstrem: menyertakan tombol filter "Stasiun Hotspot Karhutla Saja" (rentang 14–106 hari) untuk menghindari kompresi skala visual oleh episode kontinu perkotaan Jakarta (1,018 hari).
- **Validasi**:
  - Verifikasi otomatis browser headless via Playwright: 0 error console pada kedua rute (`/dashboard/pola-waktu` dan `/dashboard/faktor-pemicu`).
  - Verifikasi visual screenshot resolusi penuh (1440x900) pada kedua tab membuktikan seluruh grafik, kanvas, legenda, dan kontrol interaktif ter-render dengan presisi tinggi.
  - `bun run typecheck`, `bun run build`, dan seluruh 34 unit test lulus 100%.

## 12 November 2026 — Implementasi Tab 1 (Pola Waktu) dan Tab 2 (Faktor Pemicu)

- Mengimplementasikan seluruh komponen analisis dan visualisasi untuk Tab 1 (Pola Waktu) dan Tab 2 (Faktor Pemicu), menjawab langsung pertanyaan penelitian terkait jam sibuk, anomali kebakaran hutan/lahan (karhutla), mawar polusi 16 sektor arah angin, efek dispersi meteorologi, intensitas lalu lintas, serta komparasi pemicu konsentrasi ekstrem.
- **Data Pipelines (Python)**:
  - `scripts/export-temporal.py`: menghasilkan `tab3_temporal.json` (173.8 KB) di `dataset/dashboard/` dan `dashboard/data/`. Menyediakan profil diurnal per jam 00–23 untuk setiap tipologi zonasi (median, P25, P75), pemisahan musim karhutla (Agu–Okt) vs bulan lainnya, matriks heatmap hari × jam, deret waktu stasiun hotspot karhutla harian, serta identifikasi episode ekstrem (≥18 jam valid, batas >55 µg/m³, penggabungan jeda 1 hari).
  - `scripts/export-drivers.py`: menghasilkan `tab4_drivers.json` (71.8 KB) di `dataset/dashboard/` dan `dashboard/data/`. Menyediakan mawar polusi 16 arah mata angin (angin tenang <0.5 m/s dikecualikan), matriks korelasi peringkat Spearman 6 polutan × 3 parameter cuaca (suhu, kelembapan, angin) dengan toggle musim, dispersi polusi pada bin kecepatan angin (0–0.5 hingga 5+ m/s), scatter volume lalu lintas vs NO2/CO, serta komparasi jam ekstrem (>P95 = 109.8 µg/m³) vs jam normal.
- **Frontend Tab 1 Pola Waktu (`dashboard/src/features/temporal/`)**:
  - `types.ts`, `load.ts`, `model.ts`: schema runtime validation dengan `strict: true`, caching data, dan fungsi pemodelan.
  - `charts.ts`: Chart.js line plot dengan pita interkuartil P25–P75 via `Filler`, mode overlay komparasi musim karhutla vs bulan lainnya, heatmap matriks 7 hari × 24 jam berbasis kanvas 2D dengan skala kategori ISPU, deret waktu harian stasiun hotspot dengan ambang batas PP 22/2021 (55 µg/m³ dan 15 µg/m³), serta bar plot durasi episode ekstrem.
  - `view.ts`: kartu metrik ringkasan episode, accordion filter terlipat (default stasiun KTG-01 per keputusan 1A, filter tipologi zonasi), tombol toggle komparasi musim karhutla, dan catatan metodologi algoritma penggabungan episode.
  - `index.ts`: integrasi lifecycle dengan penanganan status loading, error/retry, dan teardown abort controller.
- **Frontend Tab 2 Faktor Pemicu (`dashboard/src/features/drivers/`)**:
  - `types.ts`, `load.ts`, `model.ts`: validasi runtime untuk seluruh relasi pemicu meteorologi dan koridor emisi.
  - `charts.ts`: Chart.js `polarArea` mawar polusi 16 sektor arah angin, kanvas 2D matriks korelasi Spearman dengan palet divergen biru–putih–merah, line plot dispersi kecepatan angin vs median PM2.5 per tipe zonasi, scatter plot volume kendaraan vs konsentrasi NO2/CO, serta grouped bar chart indikator meteorologi dan histogram jam kejadian ekstrem 00–23.
  - `view.ts`: kartu metrik ringkasan faktor kunci (96.4% jam ekstrem terjadi pada musim karhutla), 3 panel mawar polusi fixed small-multiples (`AQMS-KTG-01` hotspot karhutla, `AQMS-JKT-01` koridor perkotaan, `AQMS-KTB-01` latar bersih per keputusan 3A), filter korelasi stasiun & musim, selector polutan lalu lintas, dan analisis pemicu konsentrasi ekstrem.
  - `index.ts`: integrasi lifecycle dengan penanganan pemuatan data dan abort controller.
- **Unit Testing**:
  - Menambahkan `tests/temporal.test.ts` (5 uji) dan `tests/drivers.test.ts` (6 uji) yang memverifikasi validitas ekspor JSON, kelengkapan 24 jam diurnal, 16 sektor mawar polusi, korelasi Spearman, bin kecepatan angin, dan metrik komparasi ekstrem.
- **Validasi**:
  - `bun run typecheck` lulus 100% tanpa error di bawah konfigurasi TypeScript `strict: true`.
  - `bun run build` sukses mentransformasi 55 modul dan menghasilkan bundle produksi (`dist/dashboard/app.js` 443.21 kB dan `app.css` 49.31 kB).
  - Seluruh 34 unit test pada `tests/*.test.ts` lulus (23 uji baseline + 11 uji fitur baru).
  - Sesuai instruksi git workflow: tidak melakukan commit atau push otomatis.

## 12 November 2026 — Vite live development and Tailwind styling

- Replaced the build-on-start Python development server and standalone esbuild pipeline with Vite 8.3.8 and the official Tailwind 4.3.5 Vite integration. `bun run dev`/`npm run dev` now watches source continuously: CSS hot updates preserve selections, ordinary TypeScript/HTML/export edits reload automatically, and route-registry edits restart Vite automatically. Added `preview` for checking the production build.
- Added `vite.config.ts` and source `dashboard/entry.html`; retained the exact heading/title, `/dashboard/` HTML asset base, canonical route registry, root/index redirects, explicit unknown-route 404s, all direct deep links, static JSON exports, local fonts, and branding. Vite builds `dist/`, then `scripts/build.mjs` synchronizes the static repository dashboard and deep-link HTML entries. Imported assets are fingerprinted under `dashboard/assets/`; generated dependency licenses replace the obsolete esbuild legal-comment file. Existing static HTTP serving remains supported.
- Compiled shared layout/alignment/sizing/wrapping/control rules through 138 Tailwind `@apply` rules in `dashboard/styles.css`. Preserved exact custom tokens, font sizes, breakpoints, colors, transitions, animation behavior, and Leaflet precedence. Imported only Tailwind theme/utilities; omitted Preflight to preserve the existing reset. The shared chart lifecycle now refreshes computed palette colors after CSS HMR and removes those Vite listeners on teardown; production compilation strips HMR-only code.
- Updated `AGENTS.md` with the required Vite/Tailwind workflow, source/generated-file boundaries, automatic-update expectations, lifecycle requirements, and verification requirements. Updated README.md/design.md, synchronized npm/Bun lockfiles (resolved versions compared), and removed obsolete `scripts/dev.py`, the direct esbuild dependency, and the superseded CSS type shim in favor of `vite/client` types. Added `tests/browser/development.spec.ts` and production-preview selection in Playwright configuration.
- Validation: Node 24 strict `npm run build`, all 23 model tests, `npm ls --depth=0`, and `git diff --check` passed. The exact `bun run dev --port 5512 --strictPort` command started Vite successfully and served the canonical health route with its live client. Real edit tests proved TypeScript reload, Tailwind CSS compilation/HMR without losing the selected outcome, canvas palette repainting, HTML/JSON reload on deep links, and automatic route-registry restart; temporary edits were restored exactly. Raw source SHA-256 hashes, analytical export mirrors, generated route-entry equality, and production removal of HMR code were checked.
- Browser results: full development suite passed 46/49, retaining the same three previously reproduced overview failures (old exceedance expectation, old annual-map counts, and a strict map-alignment tolerance). After the final CSS palette listener/registry test additions, all 15 focused development/health checks passed. Full production-preview suite passed 42 checks, skipped six development-only checks, and retained only the two pre-existing overview data-expectation failures; the map-alignment check passed in that run. No new failing behavior was found in the covered interactions, routes, themes, motion, opening, ticker, filters, or responsive layouts.
- Visual verification: all seven health screenshot comparisons were pixel-identical to pre-migration captures in both development and production (320/375/768/1024/1440px light plus phone/desktop dark, reduced motion). Reviewed desktop dark and phone light output. This does not establish pixel equality for every browser or animation frame. Existing overview expectation/alignment failures remain outside this tooling task; no analytical calculation or source dataset was changed. No commit or push.

## 12 November 2026 — Remove health bottom disclosure and footer

- Removed the pictured `Data & Cara Membaca` disclosure and source footer from Dampak Kesehatan, including its table/pagination code, listeners, and unused CSS. Preserved methodology in the global dialog and adjusted chart text alternatives to remove references to deleted tables while retaining concise summaries and individual lag/bin values.
- Affected: `features/health/view.ts`, `features/health/charts.ts`, `components/methodology.ts`, `dashboard/styles.css`, rebuilt `dashboard/app.js`, the focused health browser assertions, and `design.md`. No dataset, calculation, filter, or route changes.
- Validation: strict build and all 23 model tests passed. All 8 focused health browser checks passed, including assertions that the disclosure/footer are absent, responsive layouts, filter/route interactions, and visible animation updates. Reviewed the updated desktop dark screenshot. Full-suite pre-existing overview failures remain as documented in the implementation entry. No commit or push.

## 12 November 2026 — Dampak Kesehatan implementation

- Replaced the Tab 5 placeholder with a dedicated strict TypeScript feature: outcome selection, four real-data health/bed-burden indicators, paired-coverage context, aligned daily exposure/admission plots, lag 0–7 Pearson plots, and descriptive concentration-group comparisons. Added expandable definitions plus keyboard-accessible tables and daily pagination. Preserved the required application title, original research question, branding, shared typography, and light/dark visual system.
- Reused the existing shared filters for all six pollutants, region, site type, station, dates, and QC; navigation collapses the disclosure without losing selections. Added only the seven-outcome searchable selector locally. Exposure/QC changes leave raw health counts unchanged. Kept missing/insufficient exposure visible while retaining available health summaries, and labeled respiratory bed burden independently of the selected outcome.
- Added `scripts/export-health.py` (`npm run data:health`) and mirrored outcome/exposure/source-provenance JSON files under `dataset/dashboard/` and `dashboard/data/`. Matched hospitals by checked province/district rather than row order, preserved raw outcomes/nulls, required 18 distinct eligible hourly bins per pollutant/day, excluded duplicate timestamps and invalid values, and left unverified ppm conversions unavailable. Each of the two analytical payloads is below 2 MB (452,820 and 1,924,453 bytes); no raw file or overview calculation/export changed.
- Added runtime schema/calendar/count validation, lazy health-data loading with a bounded validated cache, sibling-request cancellation on failure, loading/retry states, and abort/teardown handling. All four Chart.js instances are reused for updates; the shared lifecycle supports null-valued gaps, themes, and live reduced-motion changes. Added years on trend axes, all 0–7 lag labels, readable wrapping metric labels, desktop/two-column/phone layouts, and explicit aligned control icons.
- Updated `design.md`, `HEALTH_DATA_AUDIT.md`, the shared shell/main wiring, health-specific methodology, and the existing navigation test for the newly available tab. Source implementation lives in `dashboard/src/features/health/`; rebuilt `dashboard/app.js` through the normal build. No dependency or lockfile changes were needed.
- Validation: Node 24 strict `npm run build` and all 23 `npm test` checks passed. All 8 focused health browser checks passed, including actual counts, direct refresh/history, retained shared filters and canvas nodes, outcome selection/cancellation, missing exposure, single-day insufficient lag data, pagination, retry, pending-request navigation, theme/reduced-motion updates, and repeated teardown without detached canvas painting. Reviewed light/dark screenshots at phone/desktop widths and intermediate layouts (320–1440px), with no page horizontal overflow. Source mirrors and generated coverage counts were checked independently; `git diff --check` passed.
- Broader verification: full Playwright suite passed 40/43. The three failing overview checks were reproduced against unchanged commit `8c5a815` in `/tmp/gelar-health-baseline`: expected exceedance 17.7 versus existing 15.96; expected annual-map counts 3/24 versus existing 4/23; and map-explanation vertical-alignment tolerance (<1px) exceeded by about 1.3–1.5px. These are pre-existing overview failures and were not changed within this health-tab task.
- Limits: correlations and grouped case means are exploratory and unadjusted; no fitted risk/causal model, confidence interval, or event study is claimed. Logger-unit stations remain excluded from paired exposure analysis until conversion is supported, while their health data remain available. No exhaustive heap or assistive-technology audit, commit, or push performed.

## 11 November 2026 — Committee dataset policy and health-data audit

- Updated `AGENTS.md` and the superseding policy in `design.md` at the user's request: accept committee-provided data without repeated synthetic-data qualifications or required badges. Retained accurate source attribution, anonymous hospitals, and substantive analytical checks.
- Added `HEALTH_DATA_AUDIT.md` after scanning all 27,491 health rows and 667,981 AQMS rows, inspecting master/metadata relationships and relevant booklet definitions, and reviewing the overview notebook. Recorded health completeness, separate outcome totals, 92 total/subgroup discrepancies, differing `time` origins, station-specific PM2.5 coverage, unit questions, and current export assumptions.
- Validation: Python standard-library CSV/date/numeric audits, distinct-hour PM2.5 coverage checks, all 27 location-pair comparisons, and `git diff --check`. No raw data, generated export, frontend, or pipeline behavior changed; builds/browser tests and fitted-model validation are outside this documentation-only change. Proposed health features remain unimplemented.

## 11 November 2026 — Dynamic multi-dimensional filtering, custom date range, badges, and metric card styling

- Implemented daily multi-dimensional timeseries cube export in `notebooks/etl_tab1_ikhtisar.ipynb` and generated `tab1_ikhtisar.json` (1.64 MB, within booklet <2 MB limit) covering 1,018 dates × 27 stations × 6 criteria pollutants (`pm25`, `pm10`, `so2`, `co`, `o3`, `no2`) across both `VALID` and `VALID + SUSPECT` modes with $\ge 75\%$ daily completeness.
- Converted logger units (`_ppm` to $\mu\text{g}/\text{m}^3$) for `BJB-01`, `MDN-01`, and `PSW-01` during normalization.
- Activated all filter dimensions in `dashboard/src/components/filters.ts`: pollutant selector buttons, SUSPECT checkbox, period presets, and arbitrary custom start/end date pickers with bidirectional preset synchronization.
- Updated filter summary header (`#filter-summary`) to display modular visual badges (`.filter-badge`) including active state highlights and explicit site type scope.
- Aligned KPI metric card title (`.metric-label`) typography with panel header `h3` (`Kategori ISPU Dominan Stasiun`: 15px, font-weight 600, color `var(--text)`).
- Replaced absolute positioning of `.metric-icon` with a flex container header (`.metric-header`) aligning title and icon on the exact same horizontal row (`align-items: center; justify-content: space-between`).
- Enforced single-row display on metric card subtitle (`.metric-context`) with `white-space: nowrap; text-overflow: ellipsis;` across both expanded and collapsed sidebar layouts.
- Removed redundant scope strip (`.scope-strip`) containing station counts, date period details, and inline methodology note button from the Overview tab.
- Updated topbar eyebrow brand text from generic `PRANA / AIR & HEALTH` to an informative 6-word title `PRANA: SISTEM PEMANTAUAN KUALITAS UDARA NASIONAL`.
- Removed the `Dataset sintetis` badge from the section header in `dashboard/src/components/shell.ts`.
- Established clearer typography hierarchy between outer row containers and inner chart panels: container headers (`.panel-header h3`) enlarged to 20px (-0.025em letter spacing; 18px on mobile), while inner chart headers (`.composition-panel .panel-header h3`) and metric card titles remain at 15px.
- Made the application topbar header sticky (`position: sticky; top: 0; z-index: 900`) so title, branding, theme switch, and methodology actions stay permanently accessible when scrolling.
- Fixed sticky header overlap bug where navigating to a tab triggered browser default scroll-into-view on `main.focus()`, obscuring the page intro; resolved with `main.focus({ preventScroll: true })`, `window.scrollTo(0, 0)`, and `html { scroll-padding-top: 96px }`.
- Fixed critical station code size (`.metric-station .metric-value strong`) to `38px` on desktop and `26px` on mobile.
- Added client-side dynamic slice-and-aggregate engine in `dashboard/src/features/overview/model.ts` and hospital burden estimation over active date ranges.
- Validation: Bun TypeScript check passed with 0 errors (`bun run typecheck`), build passed (`bun scripts/build.mjs`), and 15/15 unit tests passed (`bun test`).
- Limitations: Tabs 2–6 remain placeholders pending their respective ETL pipelines. Analysis covers synthetic competition dataset.

## 10 November 2026 — Design contract and competition title correction

- Added `design.md` after reading the preliminary handbook and case-study booklet, reviewing the current dashboard source and Tab 1 pipeline, inspecting raw master/metadata tables and representative measurements, and checking all AQMS file headers.
- Documented competition constraints and scoring priorities, protected design decisions, layout and typography scales, theme colors, filter semantics, KPI definitions, chart/map conventions, responsive behavior, accessibility, and release checks.
- Added an open audit register that distinguishes unsupported or incomplete behavior from implemented features; no analytical calculations or exports changed.
- Expanded `AGENTS.md` to require reading the design contract, preserving the exact competition title and logo, retaining collapsed filters, using truthful data presentation, and maintaining Markdown change history.
- Restored `DA2026_Dashboard_NasiBakarCumiHitamPakKris_AlfinJayadi` in the visible heading and HTML document title in `dashboard/index.html`. This corrects the earlier title simplification.
- Updated `dashboard/styles.css` so the top bar can grow and the complete title can wrap; removed the title wrapper's non-shrinking constraint and text-selection restriction.
- Retained the existing all-device collapsed filter default and selected-value summary.
- Validation: checked exact title text in HTML, preserved collapsed filter initialization, parsed HTML for duplicate IDs and control structure, checked local Markdown links, and ran `git diff --check`.
- Limitations: no visual browser verification or full statistical audit performed. Other design audit items remain pending, including filter consistency, unsupported claims, unit normalization, completeness rules, and accessibility improvements. No commit or push performed for this revision.

## 10 November 2026 — Apply dashboard design and TypeScript component architecture

- Replaced the monolithic frontend with strict TypeScript under `dashboard/src/`, separating shared components, data contracts/loading/validation, the overview model/view, and modules for all six navigation sections.
- Added a locked npm toolchain, strict compiler configuration, static esbuild output, local Leaflet styles/library, and locally served Inter/Space Grotesk fonts with their licenses. Existing HTTP/Live Server access to `/dashboard/` remains supported.
- Rebuilt the layout with restrained light/dark surfaces, readable labels, consistent panel spacing, compact metrics, full competition-title wrapping, an 80px desktop rail, and a mobile navigation drawer. Preserved official branding and the all-device collapsed filter default.
- Connected region, site type, and station selections to the same overview population for metrics, distribution, rankings, map, and table. Added dependent selection reconciliation, announcements, and reset without changing disclosure visibility.
- Disabled unsupported date, period, pollutant, and SUSPECT controls with a visible explanation. The interface no longer implies that changing these unsupported dimensions recalculates the results.
- Generated a small station catalog from the raw master via `scripts/export-station-catalog.py`; retained source region-group labels, including mixed city/province groups, instead of inventing island groups.
- Replaced the unsynchronized station-day exceedance headline with selected-station count and recorded-row VALID coverage. Selected mean and highest concentration come from the existing per-station export. The existing health indicator is a separate, fixed-scope panel with its admissions/capacity denominator and limitations.
- Replaced the donut with a labeled category distribution bar and shared HTML rankings with matched zero-based scales. Ranking groups do not overlap when fewer than 20 stations match. Added an accessible full station table.
- Removed unsupported ticker claims, fabricated fallback observations and real hospital aliases, hardcoded methodology QC figures, decorative title animation, card hover glow, and runtime Tailwind/Chart.js CDN dependencies.
- Implemented native methodology-dialog semantics, contained dialog/drawer focus, Escape dismissal, focus restoration, labeled controls, a skip link, reduced-motion handling, and polite filter announcements.
- Added explicit teardown for maps, layers, resize/theme observers, component listeners, requests, retry controls, and application lifetime. Theme changes reuse the map layer; resizing refits selected station bounds. Map tile failure preserves points and the station table with a single failure message.
- Removed `dashboard/tab1_data.js` and stopped the notebook from regenerating its obsolete global-data wrapper. Measurement JSON and analytical calculations were not changed or rerun.
- Updated `design.md`, `AGENTS.md`, and `README.md` with the implemented architecture, remaining audit issues, development commands, data scope, and verification boundaries. Ignored browser-test artifacts.
- Validation: strict TypeScript checking and static build passed; all five focused data/model tests passed; all 12 browser tests passed across 320, 375, 768, 1024, 1440, and 1920px in both themes. Checked exact titles, synchronized exports/catalog copies, dependency-lock consistency, tab/map remounts, failure recovery, keyboard focus, reduced-motion reflow, and `git diff --check`. Reviewed desktop light/dark and mobile screenshots.
- Limitations: logger-unit normalization, regulatory classification definitions, daily completeness rules, and existing health missing-value assumptions still need statistical validation. These limitations are visible in the UI and methodology. Tabs 2–6 remain explicitly unavailable. Automated map tests block basemap requests to exercise failure handling; successful live tile delivery and a dedicated assistive-technology/heap-profile audit were not performed. No commit or push performed.

## 10 November 2026 — Development-server port conflicts

- Changed `dev` to run `scripts/dev.py`, which tries port 5500 and up to nine subsequent ports when occupied, prints the actual `/dashboard/` URL, supports `--port`, and closes the server on Ctrl+C.
- Updated `README.md` and `design.md` with the launch behavior. Existing processes are never stopped to free a port.
- Validation: `bun run dev --help` passed; a real occupied-port smoke check selected a subsequent port and returned the dashboard HTML with HTTP 200. No frontend behavior or dataset values changed.

## 10 November 2026 — Esri World Street Map basemap

- Replaced CARTO's light/dark tile endpoint with the public Esri World Street Map raster service in `dashboard/src/components/station-map.ts`, using the service's `z/y/x` tile order with no API-key or token parameter.
- Updated map captions and Leaflet attribution to the source list published by the Esri service. Kept the native street-map appearance in both themes and removed the unnecessary tile-theme observer.
- Retained station coordinates, measurements, filter synchronization, resize handling, map teardown, error messaging, and table alternatives. Esri is used for geographic context only, without joining external observations to the competition dataset.
- Updated the browser request interception and added an endpoint/attribution/theme regression check. Rebuilt `dashboard/app.js` and updated `design.md` and `README.md`.
- Validation: strict TypeScript checking and build passed; retrieved Esri service metadata and a real Indonesia-region tile without authentication, and visually checked the returned tile. All 13 browser tests passed, including the public Esri endpoint, provider attribution, theme preservation, synchronized filtering, and six viewport widths. `git diff --check` passed.
- Provider limitation: this legacy service is listed for retirement in December 2029 in Esri's lifecycle notice, linked from `design.md`. No API-key configuration is required by the implemented endpoint; network availability and provider terms still apply.

## 11 November 2026 — Visualization-first Ikhtisar Nasional

- Reconnected `dashboard/index.html` to the modular TypeScript application after inspecting the pulled `c593c4d` worktree; retained the exact required title, official logo, existing data exports, and Esri World Street Map. The user's stash was not applied, modified, or discarded.
- Rewrote `design.md` around visual comprehension, short supporting copy, composition/comparison chart choices, purposeful motion, alignment, responsive plotting, and accessible alternatives. Updated `AGENTS.md` to preserve this direction.
- Added locally bundled Chart.js and reusable chart/lifecycle components. Replaced the static category strip with an animated doughnut, a centered selected-station count, and a concise category/count/percentage legend.
- Replaced HTML ranking bars with animated horizontal Chart.js comparisons, direct value labels, full-location tooltips, a shared zero-based maximum, and matched category-axis widths so paired plot areas remain comparable. Small selections remain disjoint rather than duplicating stations.
- Reorganized the overview into a compact 2×2 indicator block beside composition, paired rankings, and a larger station map beside compact health context. Replaced long panel explanations with short captions while keeping the provisional-data control, health scope, units, and definitions available.
- Added category and concentration map views using the actual selected station population. Category colors and relative-size concentration markers have explicit dynamic legends; no unverified annual-compliance classifications were added.
- Added a PRANA emblem/wordmark opening with CSS haze clearing and a breathing light strip. It is keyboard-skippable, reveals loading within a bounded time, avoids trapping failed/slow data, restores access/focus, and skips decorative delay for reduced motion.
- Ensured charts mount after their panels are connected and after the opening reveals the application, so the entrance animation is visible. Filtering, themes, and sidebar resizing retain the same chart canvases; feature teardown stops/destroys charts and removes their listeners/observers.
- Restored animated sidebar widths, deliberate mobile drawer motion, filter disclosure/chevron motion, panel/dialog entrances, and press/hover feedback. Resizing across the mobile breakpoint does not animate a phantom drawer over the dashboard.
- Replaced baseline-sensitive dropdown glyphs with consistent SVG chevrons and explicit centered flex wrappers. Preserved readable labels, focus indicators, and mobile touch heights. Category fills were checked against both panel surfaces; adjusted green and amber exceed 3:1 in light and dark themes.
- Removed phase, scoring, and participation commentary from product copy. The protected exact title and official logo remain; methodological data limitations remain accessible without filling the analytical canvas with paragraphs.
- Removed the unused `tab1_data.js` global wrapper and stopped its regeneration in the notebook. Analytical calculations and measurement JSON were not changed or rerun.
- Updated README development instructions for the active build, local fonts/libraries, static server, and browser verification. Browser artifacts are ignored.
- Validation: strict TypeScript checking/build, all five data/model tests, and the full 18-test browser suite pass. Browser evidence covers actual canvas painting during animation, chart identity across updates, smooth intermediate sidebar widths, centered dropdown/disclosure icons, both map views, no phase commentary, a bounded/skippable opening, delayed/error loading, reduced motion, dialog/drawer keyboard focus, and six viewport widths in both themes. Reviewed fresh desktop light/dark, mobile, and PRANA opening screenshots. All 27 station catalog entries match the raw master; measurement JSON copies, manifest/lockfile, Markdown links, and `git diff --check` were verified. Automated basemap requests remain intentionally blocked to test graceful failure.
- Remaining limitations: normalizing logger units, validating regulatory classes and daily completeness, and auditing existing health missing-value assumptions remain analytical work. Tabs 2–6 remain explicitly unavailable. No commit, push, or publication performed.

## 11 November 2026 — Searchable filters, sidebar chevron, and tab URLs

- Added a shared searchable-select component for region, site type, and station. It searches existing option labels/code/location text without changing results until a valid option is selected, supports arrow keys/Enter/Escape/Tab, preserves committed values on cancellation, and displays field-specific no-match messages.
- Kept dependent option reconciliation and reset synchronized with the analytical state. Popup lists render outside the collapsing filter container, fit available viewport space, close when navigating/collapsing filters, and release their observers/listeners/DOM at teardown.
- Replaced sidebar/menu hamburger icons with chevrons. The toggle stays to the right of the PRANA emblem in both desktop states; the collapsed rail is 104px so the two controls remain on one row. Mobile drawer accessibility and animations remain supported.
- Introduced `dashboard/routes.json` as the shared route registry and real navigation links backed by browser history. The canonical overview path is `/dashboard`; the other tabs use `/dashboard/kepatuhan-regulasi`, `/dashboard/pola-waktu`, `/dashboard/faktor-pemicu`, `/dashboard/dampak-kesehatan`, and `/dashboard/rekomendasi-kebijakan`.
- Updated the development server to serve known routes directly, redirect root/trailing-slash/index entries to canonical paths, reject unknown paths with 404, and support a strict test port. Updated the build to generate physical HTML entries for deep links and the document asset base to `/dashboard/`.
- Browser Back/Forward restores the active section and preserves committed filters within the current session. Direct opening/refresh selects the requested section; reload-level filter persistence is not added.
- Updated `design.md`, `AGENTS.md`, and README for search behavior, chevron geometry, route ownership, and static-hosting requirements. Measurements, exports, and analytical calculations were not changed.
- Validation: strict TypeScript/build, seven data/model/route checks, and all 28 browser checks pass. Browser verification covers every direct URL/refresh, canonical entry, history, search selection/cancellation/no matches, dependent choices, mobile popup fit, and chevron placement. Reviewed fresh mobile search and collapsed-sidebar screenshots; `git diff --check` passes. No commit or push performed; the existing stash remains untouched.

## 11 November 2026 — Development refresh reliability

- Investigated the report that all UI changes were missing. The running server on port 5500 serves HTML, JavaScript, CSS, and deep links matching the updated local files; the browser URL/cache state remains unconfirmed.
- Made the development command build before serving and disabled local HTTP caching, including modification-date conditional responses, to prevent stale bundles during development. Updated README and the design contract with the exact printed-port workflow.
- Validation: strict TypeScript/build passes; temporary-server checks confirm HTML, JS, CSS, and a deep link return HTTP 200 with `no-store` even with future modification-date validators. The focused browser check for loading, searchable filtering, dependent selections, and reset passes; `git diff --check` passes. Existing development processes need restarting to load the updated server handler.


## 11 November 2026 — Reference content in the current design

- Restored the six research questions and Tabs 2–6 analytical titles, subtitles, module headings, and planned-visualization descriptions from `c593c4d`, through the existing feature modules and shared unavailable-state component.
- Added a styled research-question container and a titled indicator container using the current surface, border, type, and responsive system. Preserved the title, logos, themes, motion, searchable filters, sidebar chevrons, routes, rankings, map, and station-table alternatives.
- Restored the four headline indicator subjects: PM2.5 mean, days above the 24-hour reference, most critical station, and hospital burden. Read national exceedance and reference values from the existing validated export; expose the selected-station denominator explicitly and retain global hospital scope.
- Restored composition/geospatial and methodology titles. Kept source limitations and documented exceptions to literal copying: unverified ticker claims, static QC/violation totals, non-anonymous hospital names, annual-compliance labels for period means, and unimplemented completeness/model guarantees.
- Updated `design.md` with the content mapping, component ownership, and deliberate corrections; updated `AGENTS.md` to preserve those decisions. Raw files, measurement exports, and analytical computations are unchanged.
- Validation: strict TypeScript/build, all eight data/model/route tests, and all 29 browser checks pass. Reviewed updated desktop light and mobile dark screenshots; six viewport sizes pass in both themes. Source comparison confirms research questions/module descriptions match the reference; `git diff --check` passes. Existing data limitations remain documented.


## 11 November 2026 — Correct reference sections, map modes, and sidebar

- Corrected the prior content restoration after user review: removed the added concentration rankings and standalone `Admisi pernapasan` panel. The reference indicator/distribution section now leads directly to the full-width map in the existing design.
- Restored `Acuan Harian (ISPU 24-Jam)` and `Acuan Tahunan (PP 22/2021)`. Daily markers use modal-category colors and exported exceedance-frequency radii; annual markers use the export’s annual-reference comparison and the reference commit’s fixed concentration radius scale. Restored descriptive legends, tooltips, and mode-specific popup details; counts come from selected existing rows rather than hardcoded reference numbers.
- Removed `Prana Emblem.png` from the sidebar. Expanded header shows the textual wordmark and chevron; collapsed header shows only a centered chevron. Opening assets and official competition logo remain.
- Updated AGENTS.md and design.md to remove conflicting active directions and require an explicit current-work request before any commit/push. The preceding push was not authorized for that editing task; this correction remains local and does not rewrite remote history.
- Raw datasets, measurement exports, and analytical pipelines are unchanged. Annual-reference comparison remains visibly qualified as a period-mean comparison rather than a validated calendar-year compliance audit.
- Validation: strict TypeScript/build, all 10 unit/data/route checks, and the full 29-test browser suite pass. Additional popup-content and collapsed-desktop-to-mobile-wordmark checks pass; the popup check waits for Leaflet’s outgoing fade. Reviewed fresh desktop/mobile, annual-map, and chevron-only sidebar screenshots. `git diff --check` passes. No commit or push performed.


## 11 November 2026 — Larger sidebar icons and wordmark

- Increased collapsed navigation icons and chevron from 18px to 28px, with a 44px minimum sidebar-toggle target.
- Enlarged the expanded PRANA wordmark from 110px (90px on constrained widths) to 168px (146px on constrained desktop widths), preserving proportions and centered header alignment. Mobile drawers use the larger wordmark.
- Updated the sizing contract in design.md. Changes remain local; no commit or push.
- Validation: strict TypeScript/build and nine focused browser checks pass, covering six viewport widths in both themes, sidebar transitions, desktop/mobile wordmark visibility, alignment, and reduced-motion reflow. Reviewed updated expanded/collapsed sidebar screenshots; `git diff --check` passes.


## 11 November 2026 — Map layout and compact controls

- Grouped map explanation text into two flex columns on desktop, stacking on phones. Enlarged the map to 480–760px on desktop and 440px on phones.
- Reduced collapsed sidebar icons/chevron to 22px and scaled the collapsed competition logo down to balance the rail; retained the expanded PRANA wordmark and sidebar hit areas.
- Replaced the labeled theme toggle with sun/moon/desktop icon choices for light/dark/system preferences, persistence, live OS-theme updates in system mode, accessible selection states, and listener cleanup. Made the methodology control compact while retaining its text and dialog.
- Updated design.md with sizing and behavior contracts. No commit or push performed.
- Validation: strict TypeScript/build, all 10 unit/data/route checks, and all 31 browser checks pass. Browser checks cover OS-theme changes, explicit overrides and reload persistence, legend geometry, map sizing, six widths in both themes, navigation, and filter behavior. Reviewed updated desktop/mobile screenshots; `git diff --check` passes.


## 11 November 2026 — Correct collapsed rail proportions

- Corrected the incomplete icon-sizing adjustment: reduced the whole collapsed rail from 104px to 72px and replaced wide active rows with centered 44px square targets.
- Set collapsed navigation/chevron SVGs to 20px and centered the smaller 44px Gelar Rasa container (28px image) on the same axis. Expanded branding and mobile navigation remain intact.
- Updated the design sizing contract and existing sidebar-width checks. No commit or push.
- Validation: strict TypeScript/build and all eight focused browser checks pass, including six widths in both themes, sidebar transitions, centered controls, and desktop/mobile visibility. Reviewed the fresh collapsed-sidebar screenshot; `git diff --check` passes.


## 11 November 2026 — Map wheel zoom

- Enabled Leaflet scroll-wheel zoom while the pointer is over the map; existing zoom buttons and touch interactions remain available.
- Updated design.md. Strict TypeScript/build passes; browser verification confirms wheel zoom in/out and unchanged page scroll while hovering the map. `git diff --check` passes. No commit or push.


## 11 November 2026 — Multi-dimensional daily cube and interactive filters

- Updated `notebooks/etl_tab1_ikhtisar.ipynb` to process all 6 criteria pollutants (PM2.5, PM10, SO2, CO, O3, NO2) from 27 AQMS stations, normalize logger ppm values (x1,000 for BJB-01, MDN-01, PSW-01), apply the >=75% (18h) daily completeness rule, and include both VALID and VALID+SUSPECT records.
- Exported a compact daily multi-dimensional cube (1,018 dates x 27 stations x 6 pollutants x 2 QC modes, 1.64 MB < 2 MB booklet limit) alongside default period pre-aggregations in `dataset/dashboard/tab1_ikhtisar.json` and `dashboard/tab1_ikhtisar.json`.
- Extended TypeScript types in `dashboard/src/data/types.ts` and runtime validation in `dashboard/src/data/validate.ts` to parse the daily cube while preserving 100% backward compatibility.
- Enabled all interactive filters in `dashboard/src/components/filters.ts`: pollutant choices (PM2.5, PM10, SO2, CO, O3, NO2), period presets (All, 2024, 2025, 2026, Custom), interactive start and end date pickers (`<input type="date">`), and SUSPECT toggle.
- Added custom date range inputs in `dashboard/styles.css` with responsive layout and auto-synchronization between preset dropdown and date pickers.
- Transformed the filter summary into individual visual badges (`.filter-badge`), explicitly including the site type dimension (`Semua tipe lokasi` or active site type) and highlighting actively customized filter dimensions (`.is-active`).
- Connected client-side dynamic recalculation in `dashboard/src/features/overview/model.ts` and `dashboard/src/features/overview/view.ts` for metrics, modal ISPU categories, exceedance rates, and hospital burden in sub-millisecond response times.
- Added unit test suite `tests/dynamic-filters.test.ts` verifying dynamic pollutant switching, period slicing, and SUSPECT coverage.
- Validation: strict TypeScript `tsc --noEmit` passed; esbuild bundle rebuilt cleanly (351.8 KB); all 14 unit and model tests in `tests/*.test.ts` passed. No commit or push performed.

## 11 November 2026 — Station popup card refinement

- Reworked the map popup into an identity header, prominent period concentration, text-labeled category/reference status, semantic detail rows, and a visible annual-compliance qualification. Added theme-aware surfaces, compact spacing, viewport-constrained width, scrollable content, and a 44px close target.
- Updated dashboard/src/components/station-map.ts, dashboard/styles.css, generated dashboard/app.js, and design.md. Preserve analytical values and existing mode-specific details; no dataset or pipeline changes in this task.
- Kept open popups in view and removed automatic bounds refitting on map resize after browser checks exposed clipped popup headers. Station/filter updates still fit bounds.
- Validation: strict TypeScript, esbuild, all 16 model/data/route tests, and git diff --check pass. Node/npm were unavailable in PATH, so checks/build ran using installed Bun 1.4.4. Focused Edge browser checks pass for daily/annual content, horizontal fit, and actual close-button clicks at 375px and 1440px in both themes; reviewed mobile screenshots.
- Limitations: the existing broader map browser test stops before popup assertions because its expected annual counts (3/24) differ from the current local export results (4/23); left this unrelated analytical expectation unchanged. Basemap requests were blocked in focused browser checks. No commit or push.

## 11 November 2026 — Compact station popup without scrolling

- Simplified the previous popup at user request: reduced card width from 300px to 240px, padding from 20px to 14px, and concentration numerals from 34px to 26px. Removed Leaflet maxHeight and internal scrolling.
- Kept station identity/location, period PM2.5 concentration, dominant daily category with daily exceedance share, or annual-reference status with deviation and a short period-comparison qualification. Removed characteristic rows and repeated regulatory explanations; broader context remains in the map legend and methodology.
- Updated dashboard/src/components/station-map.ts, dashboard/styles.css, generated dashboard/app.js, and the active popup contract in design.md. Analytical data/calculations were unchanged.
- Validation: strict TypeScript, esbuild, all 16 data/model/route tests, and git diff --check pass using installed Bun (Node/npm unavailable in PATH). Focused Edge checks pass at 320px, 375px, and 1440px in both themes for both map modes, viewport fit, absence of internal scrolling/clipping, and actual close-button interaction. Reviewed the compact mobile screenshot. Basemap requests were blocked during browser checks; the broader browser suite was not rerun (its existing export-count mismatch is recorded above). No commit or push.

## 11 November 2026 — Explicit overview coverage

- Added `Cakupan 27 stasiun pemantau · Dataset sintetis` below the Ikhtisar Nasional heading; other tabs do not show this line. Renamed the full-selection mean KPI to `Rata-rata [polutan] Seluruh Stasiun`, retaining `Pilihan` for filtered station subsets. These approved wording changes clarify the dataset coverage without changing the tab name or calculations.
- Updated dashboard/src/components/shell.ts, dashboard/src/features/overview/view.ts, the coverage contract in design.md, and rebuilt dashboard/app.js. No measurement, pipeline, map, or unrelated UI changes in this task.
- Validation: strict TypeScript/build pass with installed Bun using constrained Go compiler resources. Focused Edge checks at 375px and 1440px pass for the coverage line, full/subset KPI labels, and absence of page-wide horizontal overflow. `git diff --check` passes. The package test command cannot run under this Bun-only environment (`Cannot use test outside of the test runner`); running the same four test files with `bun test` passes all 16 tests. No Node/npm installation or script changes; no commit or push.

## 11 November 2026 — Remove overview coverage sentence

- Removed only the requested coverage sentence beneath the Ikhtisar Nasional heading and its unused visibility logic in dashboard/src/components/shell.ts; rebuilt dashboard/app.js. Kept the full/subset KPI wording and all other UI content unchanged.
- Updated the active design.md contract to record this reversal; prior change-log entries are preserved.
- Validation: strict TypeScript/build and focused git diff --check pass using installed Bun. Browser checks were not rerun for this text removal. No commit or push.

## 11 November 2026 — Restore overview fact ticker

- Rebuilt the former ticker as an overview-owned TypeScript component above the indicator section. Facts derive from the same filtered station rows: highest/lowest period concentration and dominant-category counts. Single-station selections omit the redundant lowest comparison; no-match selections show an explicit empty message.
- Added a continuous approximately 40px/s strip with Jeda/Lanjut, hover/focus pause, theme tokens, and an assistive-technology-hidden visual duplicate. Live reduced-motion preferences switch to a fully readable static list. Teardown removes observers/listeners and the ticker DOM.
- Did not restore unsupported static claims from c593c4d about fire area, health effects, population coverage, or compliance totals. Facts inherit the provisional analytical limitations of current overview calculations; data and pipelines were not changed.
- Affected: dashboard/src/features/overview/ticker.ts and view.ts, dashboard/styles.css, generated dashboard/app.js, tests/browser/ticker.spec.ts, design.md, and CASE_STUDY_CONTEXT.md.
- Validation: strict TypeScript/build and all 16 existing model/data/route tests pass using installed Bun. All three focused Edge browser checks pass their assertions for actual animation, explicit pause, selected-station content, removal/remount across routes, live reduced motion, and fit at 320/1440px in both themes. Basemap requests were blocked. No commit or push.
- Verification limit: the Bun-driven Playwright runner hung while shutting down its local server after all three checks reported success and was interrupted; a clean suite exit was not obtained. A separate browser process captured desktop moving and mobile reduced-motion ticker screenshots successfully; both were visually reviewed.

## 11 November 2026 — Attach ticker to the header

- Moved the existing overview ticker into a public shell mount point immediately below the title/actions row. Both rows share one sticky header, matching the user-supplied placement reference. Replaced the floating rounded card with an edge-to-edge strip and contrasting arrow-ended Fakta label.
- Preserved fact content, filter updates, pause controls, reduced-motion behavior, and overview-only ownership/teardown. No analytical or data changes.
- Updated shell.ts, main.ts, overview/view.ts, dashboard/styles.css, generated dashboard/app.js, design.md, and focused ticker browser checks.
- Validation: strict TypeScript/build pass. All three focused Edge checks report passing assertions, including flush header placement, sticky behavior, pause/filter/navigation behavior, and live reduced motion with 320/1440px layouts in both themes. Reviewed separate dark desktop/mobile header screenshots. The Bun-driven test runner again hung during local-server shutdown after tests passed and was interrupted; no clean suite exit obtained. Basemap requests were blocked. No commit or push.

## 11 November 2026 — General health facts across all tabs and slimmer ticker

- Replaced the overview/filter-dependent ticker with one shared shell-owned instance that persists with identical content across every tab, including direct links and unavailable measurement data. Removed the obsolete feature-owned ticker and its update/mount interface.
- Added four sourced educational facts in dashboard/src/data/air-pollution-facts.ts, based on the WHO ambient-air-pollution fact sheet (24 October 2024, checked 11 November 2026). The worldwide 4.2 million premature-death estimate explicitly states outdoor air pollution and 2019; other facts cover cardiovascular/cancer risks, children, and urban/rural scope. A persistent WHO link provides attribution. This user-requested editorial context is separate from synthetic analytical outputs; no datasets or calculations changed.
- Reduced normal strip height from approximately 45px to 29px with 11px text and 28px controls. Preserved animation/pause and live reduced motion; the latter exposes a focusable manual horizontal scroller, avoiding a tall static header.
- Affected: shared fact-ticker.ts, shell.ts, main.ts, overview/view.ts, dashboard/styles.css, generated dashboard/app.js, ticker browser checks, design.md, and CASE_STUDY_CONTEXT.md. No unrelated fixes, commit, or push.
- Validation: strict TypeScript/build, all 16 existing model/data/route tests, four focused Edge browser tests, and git diff --check pass. Browser checks cover all six tab URLs without measurement data, ticker identity/content/pause across navigation and committed filters, 29px geometry, animation, source link, and keyboard scrolling/live reduced motion at 320/1440px in both themes. The runner exits cleanly when a temporary ignored configuration uses a separately managed local server; tracked server configuration was unchanged. Reviewed dark desktop/mobile header screenshots. Basemap requests were blocked; the full unrelated browser suite was not rerun.

## 11 November 2026 — Remove ticker source link and hover pause

- Removed the visible WHO link from the ticker and its unused source-link styling; retained source provenance in the fact data/design documentation. Hover now leaves the animation running. Explicit Jeda/Lanjut, keyboard-focus pause, and reduced motion remain unchanged.
- Updated fact-ticker.ts, dashboard/styles.css, generated dashboard/app.js, focused ticker browser checks, design.md, and the corresponding CASE_STUDY_CONTEXT.md description. Fact text and analytical data are unchanged.
- Validation: strict TypeScript/build, all four focused Edge browser checks, and focused git diff --check pass. Checks confirm no ticker links, actual motion while hovered, explicit pause, unchanged content across filters/tabs, direct routes without measurements, and responsive/reduced-motion behavior. No commit or push.

## 11 November 2026 — Resume ticker immediately from its button

- Restricted automatic focus pause to the ticker text viewport instead of the entire strip, so pressing Lanjut resumes movement immediately while the button retains focus. Explicit pause and text-viewport focus behavior remain available.
- Updated dashboard/styles.css, rebuilt dashboard/app.js, clarified design.md, and added a browser regression assertion for actual movement after resuming without blurring the button.
- Validation: strict TypeScript/build and all four focused Edge browser checks pass, including resume while focused, hover playback, explicit pause, filters/navigation, direct routes, and reduced-motion/responsive checks. No analytical changes, commit, or push.

## 12 November 2026 — Implement Tab 2 compliance containers and charts

- Replaced the Tab 2 unavailable module with the approved container-title hierarchy: four summary indicators, two same-scale concentration rankings, full-width daily category composition, inter-year comparison beside an explicit IKU-unavailable panel, and an annual-reference dot plot with expandable source tables. Mobile pairs stack; new KPI labels/context wrap without changing shared metric styling on other tabs.
- Added a feature-owned loader, runtime schema validation, typed domain transformations, Chart.js chart wrappers, presentation, and teardown. Existing charts/canvases are reused on filter/theme updates; chart instances/listeners/observers are released on navigation. Generalized the shared lifecycle's data type to support scatter points without bypassing TypeScript checks.
- Added scripts/export-compliance.py and data:compliance. Its 480,019-byte daily export joins the raw sensor/site master, filters QC, excludes duplicate timestamps/nonfinite/negative readings, calculates hourly means, and requires at least 18 distinct eligible hours per day. VALID and VALID+SUSPECT are exported separately; original raw files, overview outputs, and health exports were preserved. Both export copies are identical and retain hashes for all 32 source files.
- Kept unverified PM2.5 logger ppm conversions unavailable (BJB-01, MDN-01, PSW-01). JMB-02 has no days meeting the completeness rule. Default coverage is therefore 23/27 stations; no missing observations are replaced by zero. Daily exceedance uses measured station-days as its denominator. Category distribution is PM2.5-specific using the concentration breakpoints, rather than maximum six-pollutant ISPU.
- Enabled shared station/region/site-type/date/QC filtering on Tab 2 with a clear PM2.5-only scope; other pollutant choices are disabled there and restored when leaving. Annual dot plots choose their own year; the three-year comparison always uses 1 January–14 October. Their independent temporal scopes are visible. Full-year reference colors require a completed calendar and >=75% measured days (an explicitly documented analytical criterion); partial years/coverage are neutral, including 2026. No legal certification is implied.
- Updated design.md and the Tab 2 section/output contract in CASE_STUDY_CONTEXT.md to distinguish implemented charts from pending IKU/heatmap work. Retained anonymous identities and the exact application title/logo. Scope includes the new compliance feature, shared filter/shell/main integration, lifecycle typing, scoped Tailwind/CSS rules, package script, generated static bundles, export copies, and relevant tests; no unrelated fixes, commit, or push.
- Validation: strict TypeScript and Vite production build pass. All 30 unit/model/data tests pass using Bun; Node/npm are unavailable in the session PATH. Twelve focused Edge checks pass against Vite development and production preview, covering the five Tab 2 behavior/layout cases, navigation/teardown, and direct access/refresh on all six routes. The final label-wrap refinement also passes the five Tab 2 checks on preview at 320/375/768/1440px in light/dark themes. Reviewed desktop/mobile screenshots. Six independent raw-to-export daily checks (three dates, both QC modes), source hashes, export-copy identity, and git diff --check pass. No external observations or regulatory PDFs were loaded into the browser; regulatory references are linked in methodology. Basemap requests were blocked during browser checks. The unrelated full browser suite was not run.
- Remaining scope: IKU calculations need a validated NO2/SO2/index export; the station-month heatmap awaits a placement decision. The classifications here describe PM2.5 daily concentration bands, not a computed multi-pollutant ISPU index. Logger-unit conversion and broader formal annual-compliance criteria remain outside this implementation.

## 12 November 2026 — Apply approved particulate logger normalization across tabs

- Added scripts/unit_normalization.py with the user-approved interpretation of PM2.5/PM10 *_ppm as mg/m³ mass-scale values only for BJB-01, MDN-01, and PSW-01, multiplied by 1000 into µg/m³. Kept the assumption explicit, referenced the instrument manuals, checked station/master-unit scope, and excluded gas ppm from this rule.
- Applied that shared policy to the overview notebook, compliance exporter, and health exposure exporter. Executed all overview notebook code cells and updated their actual outputs; regenerated matching display/export JSON and unit provenance. Compliance now has 26/27 measured stations; JMB-02 remains without eligible daily means. Raw files, hospital case counts, and the separate health outcome JSON files are unchanged (the latter verified byte-for-byte).
- Added per-station unavailable-pollutant metadata and runtime validation for the overview cube. Unconverted gas loggers are omitted from air metrics with an explicit scoped note rather than rendered as zero; hospital scope remains based on station/date selections independently of air-unit availability. Updated only normalization-related methodology text and the design/case-study contracts.
- Affected: shared Python unit policy, scripts/export-compliance.py, scripts/export-health.py, notebooks/etl_tab1_ikhtisar.ipynb, derived overview/compliance/exposure/provenance exports, overview data types/validation/model/view, related methodology text, focused tests, generated dashboard/app.js, design.md, and CASE_STUDY_CONTEXT.md. Existing aggregation/completeness differences between pipelines were not refactored in this unit task.
- Validation: strict TypeScript/Vite build, 31 TypeScript data/model tests, and 3 Python normalization tests pass. Raw first-day values for all three loggers and sampled cross-tab daily values agree with the approved factor at each export's documented precision. Fourteen focused compliance/health/overview Edge checks pass against Vite development and production preview, including normalized logger coverage, unavailable gas behavior, unchanged hospital scope, filters, retry/cancellation, chart reuse/teardown, reduced motion, and responsive layouts. Export copies match; git diff --check passes. Tests used installed Bun because Node/npm are not in PATH; basemap requests were blocked. The full unrelated browser suite was not run.
- Limitation: the mass-scale interpretation remains an approved analytical assumption, not a verified declaration by the committee or a universal conversion of ppm. Gas conversion requires a separate pollutant-specific decision. No commit or push.

## 12 November 2026 — Compact Tab 2 rankings and priority category view

- Daily category composition now defaults to the ten stations with the highest share of measured days in Tidak Sehat or worse. Added Prioritas / Semua stasiun controls with pressed states, an explicit displayed/eligible count and selection criterion, and the full-selection option. The complete data tables, filter state, measurements, and analytical denominators are unchanged.
- Reduced ten-entry ranking plot heights from 385px to 260px using 22px rows and 12px bars while preserving label size, direct values, all entries, common scale, and instance reuse. The distribution uses 28px rows (325px for ten priorities) and expands only when the user chooses all stations.
- Moved the priority selection into the compliance model. Toggling display mode refreshes only the existing distribution chart; other charts and summary cards remain untouched. Updated the related design/case-study contracts.
- Affected: compliance/model.ts, charts.ts, view.ts, the scoped toolbar style in dashboard/styles.css, generated dashboard/app.js and app.css, tests/compliance.test.ts, tests/browser/compliance.spec.ts, design.md, and CASE_STUDY_CONTEXT.md.
- Validation: strict TypeScript/Vite build, all 32 unit/data/model checks, and all six focused compliance Edge browser checks pass against both Vite development and production preview. Checks cover priority/all ordering and subset sizes, one-station behavior, retained canvas identity, unchanged summaries, compact ranking geometry, responsive layouts in both themes, date filters, and retry behavior. Reviewed cropped desktop ranking and priority-distribution screenshots plus the responsive test captures. git diff --check passes. Tests used installed Bun; basemap requests were blocked; the unrelated full browser suite was not rerun. No data regeneration, commit, or push.

## 12 November 2026 — Regional dot plot for inter-year compliance

- Replaced the three aggregate annual bars with the user-selected regional dot plot: one row per original region_group, with distinct colors and marker shapes for 2024, 2025, and 2026. Rows are ordered by the absolute 2026–2024 change; the fixed 1 January–14 October window and effective station/region/site-type/QC scope are stated explicitly.
- Regional percentages pool exceedance station-days over measured station-days. Missing years have no point rather than a fabricated zero; genuine zero rates remain visible. The default view has 21 measured groups out of 22. Tooltips and an expandable accessible table provide percentages, numerators, denominators, and signed endpoint changes in percentage points; methodology explains unequal coverage and the absence of causal interpretation.
- Added the dedicated regional-chart.ts component and regional model/types, preserving chart reuse, theme updates, reduced motion, teardown, and the existing container/IKU layout. Other charts and measurement exports are unchanged by this task. Updated compliance view/model tests, browser coverage, design.md, CASE_STUDY_CONTEXT.md, and the generated dashboard/app.js.
- Validation: strict TypeScript/Vite production build and all 33 unit/data/model tests pass. All seven focused compliance Edge browser checks pass against both Vite development and production preview, including regional filtering, missing groups, canvas reuse, responsive light/dark layouts, existing distribution/ranking behavior, date scope, and loading retry. Reviewed desktop/mobile chart captures; git diff --check passes. Checks used installed Bun because Node/npm are unavailable in PATH; basemap requests were blocked. The unrelated full browser suite was not rerun. No data regeneration, commit, or push.

## 12 November 2026 - Undo regional inter-year dot plot

- At the user's request, removed the regional dot plot, regional detail table/legend, grouping model, and associated regional tests. Restored the three aggregate inter-year horizontal bars and comparableYears calculation, preserving fixed Jan 1-Oct 14 periods, selected station/region/site-type/QC scope, and missing rates as null.
- Updated the current design/case-study contract and regenerated dashboard/app.js. The earlier regional-dot-plot changelog entry remains as historical work now reversed. Priority category distribution, compact rankings, annual concentration dots, and all other earlier changes remain in place.
- Validation: strict TypeScript/Vite build, all 32 unit/data/model checks, and all six focused compliance Edge browser checks against production preview pass, including filtering, chart reuse, responsive themes, date scope, retry, and priority/all-station behavior. git diff --check passes. No datasets regenerated, commit, or push.


## 12 November 2026 - Repair compliance filters and implement period IKU estimates

- Removed the Tab 2 PM2.5 override/disabled pollutant buttons. All six shared pollutant choices now use actual raw-derived series and update concentration rankings, daily category counts, exceedance denominators, annual references, labels and detail tables; selections persist across tabs. Existing priority/all category views, compact rankings and aggregate inter-year bars are preserved. The separate annual-year and fixed Jan 1-Oct 14 scopes remain explicit.
- Upgraded scripts/export-compliance.py and both compliance_daily.json copies to schema version 2: six daily pollutants with separate VALID and VALID+SUSPECT series, and CO/O3 within-day maximum eight-hour means. Daily means require 18 eligible hourly bins; eight-hour maxima require at least 13 of 17 complete eight-hour windows, with no imputation or cross-midnight windows. Used PP references for the correct averaging periods, pollutant-specific ISPU concentration bands and annual PP/WHO references; CO annual evaluation is explicitly unavailable. Preserved the approved particulate scaling and excluded unsupported gas ppm. Raw files, overview/health pipelines and their measurement exports were not modified in this task.
- Replaced the IKU placeholder with the Permen LHK 27/2021 transformation applied to paired daily NO2/SO2 means, equal station weights within original region_group and actual selected dates/dimensions/QC. Kept this clearly a monitoring-network period estimate rather than official administrative/annual IKU. Displayed five lowest regional estimates, the full expandable coverage table, categories and explicit missing states; retained disclosure state on updates and shared chart lifecycle. Default coverage: 26/27 particulate stations, 23/27 gas stations, 18/22 regional IKU estimates. Unsupported units and absent pairs do not produce zero scores.
- Affected: compliance exporter and generated data, feature types/load/model/view/charts plus new pollutants.ts and iku.ts, shared filter/main integration, unit/model/browser tests and test_compliance_export.py, generated dashboard/app.js, design.md and CASE_STUDY_CONTEXT.md. Regulatory references are documented; all observations remain from the supplied dataset.
- Validation: strict TypeScript/Vite build, all 35 TypeScript unit/data/model tests and three Python export checks pass. Independent raw checks cover three stations, five pollutants where units permit, three dates, both QC modes, daily means and eight-hour maxima; all recorded raw-source hashes and export-copy bytes match. All eight focused compliance Edge browser checks pass against both Vite development and production preview, covering six effective pollutant choices, date/region/site/station/QC changes, IKU independence from pollutant choice, empty gas selections, filter reset and cross-tab persistence, chart reuse, retry, and 320/375/768/1440px layouts in light/dark themes. Reviewed desktop/mobile IKU captures. git diff --check passes. Tests used installed Bun because Node/npm are unavailable in PATH; basemap requests were blocked. The unrelated full browser suite was not rerun. No commit or push.
- Remaining limits: gas ppm at BJB/MDN/PSW requires a separate verified unit policy; sparse or filtered station coverage is not representative of all residents or the official four-land-use sampling design. Eight-hour completeness is an explicit conservative analysis choice. The heatmap remains pending placement; broader overview reference/methodology changes remain outside this task.


## 12 November 2026 - Apply approved temporary gas ppmv conversion

- Applied the user's temporary analytical assumption to SO2, CO, O3 and NO2 at BJB-01, MDN-01 and PSW-01: treat labelled ppm as ppmv and convert to ug/m3 using molecular mass / 24.45 * 1000 at assumed 25 C and 1 atmosphere. Kept full computed factors with molar masses 64.066/28.010/48.000/46.006 g/mol respectively. Preserved particulate mass-scale conversion separately; did not use row weather temperature or infer unrecorded pressure. Conditions and ppmv interpretation remain unconfirmed by the committee.
- Updated the shared unit_normalization.py policy and provenance references, ran every overview notebook code cell, and regenerated overview, compliance and health-exposure/provenance exports in their paired locations. Gas filters and downstream daily categories, exceedance/annual comparisons, IKU and health pairing now consume the converted values. Default compliance gas coverage rises from 23 to 26 of 27 stations; regional IKU from 18 to 21 of 22 groups. JMB-02 remains without eligible daily means. Existing QC, averaging windows, completeness rules and cross-tab aggregation differences were preserved.
- Updated conversion-specific methodology in the compliance view and shared methodology dialog, notebook text, design.md and CASE_STUDY_CONTEXT.md. Updated affected unit/model/browser expectations and strengthened raw-to-export and cross-tab checks for all six logger pollutants. Affected files also include export-compliance.py, export-health.py, generated dashboard/app.js, measurement exports and provenance; layout and unrelated reference definitions were not changed.
- Verified non-designated station series and every particulate series remain identical to the pre-conversion snapshot across all three pipelines. Both hospital-outcome files are byte-identical to the pre-conversion baseline (restored their original line endings after regeneration); raw-source hashes and export-copy identity match. No observations or case counts were invented or replaced.
- Validation: strict TypeScript/Vite build, all 35 TypeScript unit/data/model tests and all six Python normalization/export checks pass. Raw first-day checks cover all three loggers and all six pollutants; sampled daily means agree across exports at their documented precision, with additional source-based checks for gas eight-hour maxima and QC. All 17 focused compliance/health/overview Edge browser checks pass against both Vite development and production preview, including converted gas filters, IKU availability, unchanged hospital scope, missing JMB-02 data, cross-tab persistence, chart reuse/teardown, reduced motion and responsive themes. An initial development run had three reload/loading timeouts while export files were being finalized; the complete rerun on stable files passed. git diff --check passes. Used installed Bun because Node/npm are unavailable in PATH; map requests were blocked in compliance tests. The full unrelated browser suite was not rerun. No commit or push.


## 12 November 2026 - Compare station compliance across years and estimate IKU per station

- Replaced aggregate inter-year percentages with per-station comparisons over the existing fixed Jan 1-Oct 14 window in 2024/2025/2026. Region/site-type/station/pollutant/QC apply; global dates remain separate. Select at most two strictly decreasing and two strictly increasing stations, ranked by endpoint change within each direction, without filling with flat/fluctuating/incomplete cases. The default PM2.5 VALID view contains three qualifying examples: SM2-01 improves; KTG-01 and KTG-02 worsen. This is descriptive change, not statistical significance or a causal policy claim.
- Added horizontal grouped bars with three stable year colors, a legend, a shared zero-to-100 percent scale, direct values for every year's bar, and a visible example/direction count. Added a complete expandable table for every selected station, including yearly exceedance/eligible-day counts, percentages, adjacent and endpoint changes in percentage points, pattern and chart inclusion. Preserved disclosure state on filter updates; missing data and a lack of qualifying examples have explicit states.
- Changed Estimasi IKU Daerah into Estimasi IKU Stasiun. Apply the existing formula to each station's paired NO2/SO2 daily means without aggregating across stations/regions. The chart shows up to five lowest station scores; the full table gives station, original region context, gas means, category and paired days. Global dates/dimensions/QC still apply, and the pollutant choice does not replace the two gases. The default table has 27 selected stations, 26 with estimates; JMB-02 remains unavailable. Retained the gas/particulate assumptions and official-index qualification.
- Affected: compliance/types.ts, model.ts, iku.ts, view.ts, charts.ts, unit/browser tests, generated dashboard/app.js, design.md and CASE_STUDY_CONTEXT.md. Removed the obsolete aggregate-year calculation and regional IKU interface. Preserved chart instances and teardown/theme/reduced-motion/CSS-HMR behavior. Other panels, raw files, analytical pipelines and measurement exports were not changed or regenerated.
- Validation: strict TypeScript/Vite production build, all 37 unit/data/model tests and all nine focused compliance Edge browser checks pass against both Vite development and production preview. Checks cover year-specific denominators for every pollutant/QC mode, constrained example selection, missing data, individual IKU values, region/site/station/date/QC scope, unchanged fixed comparison dates, expanded-table persistence, chart reuse, loading/retry, cross-tab pollutant persistence and 320/375/768/1440px light/dark layouts. Reviewed cropped desktop/mobile grouped-bar and station-IKU captures. git diff --check passes. Used installed Bun because Node/npm are unavailable in PATH; basemap requests were blocked. The unrelated full browser suite was not rerun. No commit or push.


## 12 November 2026 - Vertical year bars and matching analytical-panel heights

- Changed only the inter-year grouped bars to vertical orientation, keeping station groups and the fixed three-year colors. Moved the percent scale to the vertical axis with a zero baseline and an upper bound rounded up to the next ten percentage points (minimum 10, maximum 100) to use the available plot area. Wide plots show values above bars; plots below 480px retain tooltip, screen-reader list and full table values to avoid label collisions.
- Scoped a flex/grid layout to the comparison/IKU panel pair. Closed panels now have equal heights on desktop and stacked mobile layouts; chart frames fill the available body space with a 160px minimum instead of leaving an unused footer gap. Opening either data table allows independent content-driven heights. Other ranking/distribution geometry, analytical selection, metrics and measurements are unchanged.
- Affected: compliance/charts.ts and view.ts, scoped dashboard/styles.css, generated dashboard/app.js and app.css, focused browser geometry check, design.md and CASE_STUDY_CONTEXT.md. No datasets or pipelines changed.
- Validation: strict TypeScript/Vite build, all 37 unit/data/model tests and all ten focused compliance Edge browser checks pass against Vite development and production preview. The new check measures equal panel heights/footer gaps on desktop/mobile and checks rendered bar pixels for vertical geometry; existing checks cover filter scope, chart reuse, table behavior, retry, responsive themes and station comparisons. Reviewed desktop/mobile captures; closed panels measure 426.75px each at 1440px and 480.72px each at 375px. git diff --check passes. A parallel shell launch initially failed due to Windows paging-file pressure; sequential reruns completed. Used installed Bun; basemap requests were blocked. The unrelated full browser suite was not rerun. No commit or push.


## 12 November 2026 - Remove day-count sublines from comparison table

- Removed the extra exceedance/eligible-day text such as 44 / 288 hari from inter-year table cells; each year now shows only its percentage or unavailable state. Updated the caption and directly related methodology/footnote and design/case-study wording. Calculations, delta columns, patterns, other tables and measurements are unchanged.
- Affected: compliance/view.ts, generated dashboard/app.js, design.md and CASE_STUDY_CONTEXT.md. Validation: strict TypeScript/Vite build and the existing focused station-comparison browser test on production preview pass; git diff --check passes. No new tests, datasets, commit or push.


## 12 November 2026 - Replace KTG-02 example with Palembang and remove chart-inclusion column

- Replaced the automatically selected KTG-02 chart example with PLB-01 when Palembang is inside the effective filters and has all three comparison years. Avoid duplicate Palembang examples and keep filtered scopes intact. The default chart now contains SM2-01, KTG-01 and PLB-01. Retained PLB-01's actual fluctuating pattern and percentages; updated the scope and methodology to explain this user-selected exception without labelling it consistently worsening.
- Removed the Pada grafik header and row cells from the comparison table. All station rows, annual percentages, change columns and actual patterns remain. No measurement, aggregation, chart geometry, other table or IKU change.
- Affected: compliance/model.ts and view.ts, unit/browser checks, generated dashboard/app.js, design.md and CASE_STUDY_CONTEXT.md. Validation: strict TypeScript/Vite build, all 38 unit/data/model tests and all ten focused compliance Edge checks on production preview pass. Coverage includes the exact default substitution, regional filter scope, preserved Palembang pattern, no inclusion column, table completeness, chart reuse and responsive equal-height panels. git diff --check passes. No dataset regeneration, commit or push.


## 12 November 2026 - Remove comparison count and pattern summary

- Removed the entire line showing example count and improving/worsening/fluctuating counts from the inter-year panel, including the unused DOM/update code and its aria-describedby reference. Retained the legend, actual station selection, pattern table and methodology; existing flexible paired-panel sizing makes the container more compact while keeping it aligned with IKU.
- Affected: compliance/view.ts, generated dashboard/app.js and design.md. Validation: strict TypeScript/Vite build and the existing production browser check for vertical bars, equal desktop/mobile panel heights and footer spacing pass. git diff --check passes. No tests added, measurements changed, commit or push.


## 12 November 2026 - Searchable user-selected comparison stations with four defaults

- Added a collapsed Pilih stasiun pembanding disclosure with four shared searchable-select controls. Initial full-scope choices are SM2-01, KTG-01, PLB-01 and JKT-01. Users can search, replace or clear any slot; occupied stations are excluded from other slots. Search alone does not commit state, Escape restores the previous choice, and the local controls update only the comparison chart rather than metrics, IKU or the complete table.
- Replaced the automatic consistent-change selection and special KTG-02/PLB-01 substitution with explicit local selection. Kept the year window, pollutant/QC calculation, vertical grouped bars, true patterns and full globally scoped table. Flat/fluctuating/partial profiles may be selected; missing measurements remain null. Empty selections prompt a choice, while entirely unmeasured choices show an unavailable state.
- Global station dimensions constrain every local option. Retain compatible selected slots when scope changes; clear incompatible slots and initialize up to four scoped defaults only if no selected station survives. Preserve selections through pollutant/QC/date updates and allow intentional clears while scope is unchanged. Narrow scopes may have fewer than four. Local state resets on feature remount, consistent with the feature-owned lifecycle; this task does not add cross-session persistence.
- Used the existing shared control popup/keyboard behavior and destroyed all four control resources on teardown. The picker is two columns on roomy panels and one on phones; the default closed state preserves compact, equal-height comparison/IKU panels. Updated methodology, design.md and CASE_STUDY_CONTEXT.md without restoring the removed count summary or table inclusion/day-count lines.
- Affected: compliance/model.ts and view.ts, scoped dashboard/styles.css, generated dashboard/app.js and app.css, unit/browser checks and design/case-study docs. No raw files, measurement exports, aggregation pipelines or IKU calculations changed.
- Validation: strict TypeScript/Vite build, all 37 current unit/data/model tests and all eleven focused compliance Edge browser checks pass against both Vite development and production preview. Replaced obsolete automatic-selection tests with default/scope checks; added meaningful UI coverage for four initial values, searchable non-committing input, duplicate prevention, replace/clear behavior, retained canvas identity, unaffected metrics/IKU, pollutant persistence, regional reconciliation and recovery from an empty selection. Existing checks cover full tables, missing JMB-02 data, retry, geometry, themes and responsive layouts. Inspected picker and search captures on desktop/mobile. git diff --check passes. Used installed Bun; basemap requests were blocked. The unrelated full browser suite was not rerun. No commit or push.


## 12 November 2026 - Use BJB-01 as the fourth default comparison

- Replaced JKT-01 with BJB-01 in the four initial comparison choices. Retained SM2-01, KTG-01 and PLB-01, manual station availability, filtering and calculations. Synchronized the local methodology, design/case-study docs and existing default/picker assertions (including Jakarta fallback behavior).
- Affected: compliance/model.ts and view.ts, generated dashboard/app.js, existing unit/browser tests, design.md and CASE_STUDY_CONTEXT.md. Validation: strict TypeScript/Vite build, all 13 focused compliance unit checks and the existing production picker browser check pass; git diff --check passes. No measurement changes, new tests, commit or push.

## 12 November 2026 - Keep unmeasured overview stations without inventing clean observations

- Separated station-dimension filtering from nullable daily observations and added measured-day/period-day coverage plus unavailable reasons. Tab 1 skips missing days, preserves genuine measured zeros, and computes air means, exceedance means, critical-station selection and category composition from measured stations only. Default VALID coverage is 26/27; JMB-02 remains unmeasured in both QC modes. Removed the obsolete no-cube fallback to an old national exceedance number.
- Kept all 27 selected station identities, coordinates and table rows. Missing observations now show Data tidak mencukupi, concentration Tidak tersedia and a fixed-size gray dashed marker in both map modes, with an unavailable legend entry rather than a Baik/annual-within classification. Added actual measured/period-day coverage and percentage to popups and existing concentration cells; no separate Valid column. Sparse stations retain their observed calculations and visible coverage. JMB-02-only selections show dashes in the three air cards and a category-unavailable state while retaining their hospital scope and map location.
- Added a compact effective-coverage line and measured-station wording, synchronized availability/denominator methodology, and constrained the overview grid/table host so opened coverage tables scroll internally on phones. Preserved the overview section inventory, title/logo, other tabs, chart/map lifecycle, unit policy and independent health indicators. Did not impute, change raw data, regenerate measurement exports or modify the older overview daily-aggregation rules; its 18-QC-row rule does not guarantee 18 distinct hours/per-pollutant values.
- Affected: data/types.ts and observations.ts, overview/model.ts and view.ts, map/model, shared palette/station-table/distribution empty state, scoped overview CSS, relevant methodology, unit/model/browser checks, generated dashboard/app.js and app.css, design.md and CASE_STUDY_CONTEXT.md. Updated old doughnut-count expectations to the measured count while preserving station/map totals.
- Validation: strict TypeScript/Vite production build and all 41 unit/data/model tests pass. All 23 focused overview-missing/compliance/health Edge checks pass on Vite development, including null-versus-zero behavior, full/partial/unsupported/empty observation scopes, neutral markers in both modes, preserved hospital data, filters/QC, table/popup coverage, chart lifecycle and responsive light/dark layouts at 320/375/768/1440px. An initial opened-table page-overflow failure was fixed and the complete rerun passed. Basemap requests were blocked. Tests used installed Bun because Node/npm are unavailable in PATH.
- Verification limit: production browser checks could not reach the inactive preview server (connection refused); starting preview then failed because Windows rejected new process creation with CreateProcessWithLogonW error 1909. A cmd-shell retry hit the same OS error. The production build passed, but preview interactions and the final git diff check were not verified in this turn. The unrelated legacy full browser suite was not run. No commit or push.


## 12 November 2026 - Default annual evaluation to Top 10 with a full-station option

- Annual evaluation now starts with the ten highest measured annual mean concentrations in the selected evaluation year and effective pollutant/dimension/QC scope. Added Top 10 / Seluruh stasiun controls with pressed states and plotted/measured counts. Fewer available stations remain fewer; missing means are excluded from points, and CO's unavailable annual reference disables these display controls with an explicit explanation.
- Display-mode changes reuse and update only the annual chart and its controls. The complete annual table, summary metrics, comparison picks, category distribution, IKU and calculations remain unchanged. Preserve the display mode through year/filter updates; retain the existing reference lines, partial-year/coverage neutral colors and chart lifecycle. The initial 26-station measured scope now plots ten entries in a 365px frame, with all 26 available on request.
- Added a focused model check for ranking/full scope/missing values/input immutability and a browser check for initial Top 10, full expansion, chart identity, unaffected other panels/table, narrower filters and CO's disabled state. Synchronized feature methodology, design.md and CASE_STUDY_CONTEXT.md. Affected: compliance/model.ts, view.ts, charts.ts, existing unit/browser tests, generated dashboard/app.js and the related docs. No measurement exports or raw data changed; no dependencies or CSS changes.
- Validation: strict TypeScript/Vite build, all 42 unit/data/model tests and all 12 compliance browser checks on Vite development pass. All 24 compliance/overview-missing/health Edge checks pass on production preview, including the preceding Tab 1 missing-data behavior whose production verification had been blocked. Reviewed annual Top 10 desktop/mobile captures and confirmed 10/26 versus 26/26 counts. git diff --check passes. Normal process creation still returned Windows error 1909; an alternate execution context successfully ran build, tests and both local servers, resolving the earlier preview-verification limitation. Basemap requests were blocked; the unrelated legacy full browser suite was not run. No commit or push.


## 12 November 2026 - Hide redundant period-table day-count column

- Period tables now show Hari pembanding only when at least one selected station has a different regulatory-comparison day count from its 24-hour measured-day count. When all counts match, retain Hari terukur alone. Header and row cells use the same condition; calculations and annual tables are unchanged. Updated the directly related methodology and design contract.
- Confirmed the distinction in the existing export: PM2.5/PM10/SO2/NO2 use the same daily series for both counts in both QC modes; CO/O3 eight-hour maxima can have fewer eligible days. The display condition follows actual filtered rows, so a CO scope with matching counts also hides the duplicate.
- Affected: compliance/view.ts, generated dashboard/app.js, design.md. Validation: strict TypeScript/Vite build passes. A focused browser diagnostic on production preview verified hidden duplicate columns for all four 24-hour pollutants, retained distinct CO counts, scoped CO/BJB-01 duplicate hiding, and header/body alignment. The diagnostic initially needed to reopen the period disclosure after filter updates; after correcting that inspection step, all checks passed. git diff --check passes. No permanent tests added, measurements changed, commit or push.

## 12 November 2026 - Compact period table when comparison days are visible

- Reduced cell padding and allocated fixed column widths only when the bottom period table includes Hari pembanding. Headers and descriptions wrap while keeping the existing 12px font, all eleven columns and all 27 station rows. Constrained the compliance grid so the opened table cannot widen the page. Calculations, column visibility rules and other table layouts remain unchanged.
- Affected: compliance/view.ts, dashboard/styles.css, rebuilt dashboard/app.js and app.css, design.md. Browser measurements on Vite development and production preview confirm no table scrolling at 1280/1440px and no page overflow at 375/1024/1280/1440px. At narrower widths the table retains internal scrolling with an 880px minimum width for readability. Reviewed the rendered 1280px table.
- Validation: strict TypeScript/Vite build, all 42 unit/data/model checks and all 12 compliance Edge browser checks on both development and production pass. Basemap requests were blocked. No permanent tests, data changes, commit or push; the unrelated full browser suite was not rerun.

## 12 November 2026 - Clarify inter-year exceedance and make partial annual data optional

- Renamed the inter-year panel to Perbandingan Pelampauan Antar-Tahun to match its percentage of days above the reference. Preserved all values, station choices and chart geometry.
- Added an initially unchecked Sertakan data parsial option to annual evaluation. Filter partial rows using the existing completed-year/75%-of-calendar rule before Top 10 or full-scope selection; retain neutral colors when included. Keep every station in the full annual table. The checkbox updates only the reused annual plot, persists across local/global filter updates and disables for CO. An all-partial scope explains how to reveal its points.
- Annual tooltips and screen-reader alternatives show measured/full-calendar days and percentage coverage, accounting for leap years. Reused a shared calendar-day helper for assessment and coverage; no changes to classifications, exports, raw data or completeness thresholds. Synchronized methodology and design/case-study documentation.
- Affected: compliance/view.ts, model.ts and charts.ts, rebuilt dashboard/app.js, focused browser coverage and related docs. Validation: strict TypeScript/Vite build, all 42 unit/data/model tests and all 13 compliance Edge browser checks pass on both development and production preview. The added browser check verifies partial inclusion, unchanged metrics/table/comparison, retained chart identity, all-partial empty state, leap-year coverage and disabled CO state. A production hover diagnostic confirmed the rendered tooltip reads Cakupan: 365 / 365 hari (100%); reviewed the 375px annual panel and confirmed no page overflow. Basemap requests were blocked; the unrelated full browser suite was not rerun. No commit or push.

## 12 November 2026 - Executed notebook explaining Tab 2 data filtering

- Added `notebooks/simulasi_penyaringan_tab2.ipynb` with saved outputs from raw JKT-01, MDN-01, PLB-01 and JMB-02 measurements. Walks through QC labels, unit normalization, sequential rejection counts and original row samples, VALID versus VALID + SUSPECT, hourly/daily completeness, all 17 CO windows on a real failing day, and annual calendar coverage/partial inclusion. Includes two figures and editable station selection. No fabricated records, imputation, new filtering criteria or dashboard changes.
- Output demonstrates that JMB-02 has 764 eligible PM2.5 records in VALID + SUSPECT but zero complete daily means. A real JKT-01 CO example on 2 January 2024 has 23 eligible hours but only nine complete eight-hour windows, so its 24-hour mean exists while its comparison maximum is unavailable. Annual examples distinguish missing observations from the unfinished 2026 calendar.
- Validation: executed all nine code cells successfully with Jupyter nbconvert; validated notebook schema, execution counts and absence of error outputs; reviewed the annual coverage figure. Explicit daily/window calculations match the production aggregator. All 24 selected series across 1,018 dates match dashboard exports exactly, all 32 recorded source hashes match, and both export copies are identical. All three existing Python compliance-export tests pass. The notebook is read-only toward raw/exports; analysis examples cover two pollutants/four stations, not all six pollutants/all 27 stations. Python dependencies were already available. No frontend build/browser checks required for this notebook-only task; no commit or push.

## 12 November 2026 - Require the verified AQMS filtering flow in repository instructions

- Added Shared AQMS filtering contract to AGENTS.md, linking the executed walkthrough and production sources. Specifies QC modes, station-specific normalization, duplicate/time/value eligibility, equal-weight distinct-hour aggregation, 18-hour daily and CO/O3 13-of-17 eight-hour completeness, actual denominators, annual coverage/partial selection and missing-data handling. Requires reuse/verification, provenance and synchronized methodology rather than divergent cleaning rules.
- Scoped the contract to AQMS, preserving separate hospital outcome rules. Explicitly records that existing older pipelines are not automatically migrated or assumed compliant; unrelated migrations and new filtering/conversion assumptions need user approval. No application, pipeline, export or notebook changes.
- Affected: AGENTS.md, design.md and this log. Validation: checked the documented contract against the production filtering and annual-assessment implementations already inspected in this session; git diff --check passes. Documentation-only change; no build, test or browser rerun required. No commit or push.

## 12 November 2026 - Explain the filtering flow in dashboard methodology

- Added a shared seven-step ordered explanation to the global Metodologi dialog and Tab 2's Metodologi & cakupan data disclosure. Documents source/unit assumptions, QC, duplicate/time/value eligibility, hourly-to-daily aggregation, CO/O3 eight-hour windows, actual denominators and annual completeness. Explains missing versus zero, no imputation and what partial inclusion changes. Keeps Tab 1's existing aggregation limitation explicit and distinguishes hospital data rules.
- Extended calculation provenance with the Tab 2 exporter, normalizer, export copies and executed walkthrough notebook. Reused one presentation component for both surfaces and existing typography with scoped list spacing. Affected: components/aqms-filtering-methodology.ts, components/methodology.ts, compliance/view.ts, dashboard/styles.css, rebuilt app.js/app.css and design.md. No analytical, raw-data or export changes.
- Validation: strict TypeScript/Vite build and all 42 unit/data/model tests pass. A focused Edge browser diagnostic confirms matching seven-step content on both surfaces, essential filtering rules, internal dialog scrolling, no horizontal page/dialog overflow and Escape/focus restoration at 375/1440px on development and production preview. Existing methodology keyboard-focus/Escape/theme browser test passes on both servers; reviewed the production mobile capture. Basemap requests were blocked. No permanent tests added and the unrelated full browser suite was not rerun. git diff --check passes; no commit or push.

## 12 November 2026 - Record imputation mode for the finishing discussion

- Created TODO_FINISHING.md with an unchecked discussion item for Sertakan data hasil imputasi. Captures the proposed default-off mode, separation from QC/partial inclusion, preserved observed coverage, explicit estimated provenance and decisions on methods, eligible gaps/stations, validation, denominators and affected analyses. Linked the agenda from design.md and distinguished discussion approval from implementation approval.
- Documentation only: no filter, imputation, dataset, calculation or interface changes. Validation: reviewed status/scope and relative reference paths; git diff --check passes. No build/tests needed, commit or push.

## 12 November 2026 - Remove redundant scope text and share the filter/content divider

- Removed the Tab 1 measured-station/insufficient-data sentence and Tab 2 pollutant/period/measured-station/QC sentence above analytical content, including their DOM/update paths. Preserved coverage in existing maps/tables/chart summaries and actual measured-only calculations. Updated existing browser assertions to check doughnut counts/summary metrics rather than deleted text.
- Added a shared filter-host bottom border using the theme border token, with 20px spacing before content. Applies to Tab 1, Tab 2 and Tab 5 and future tabs using global filters; hidden filter hosts produce no divider. Preserved default collapsed state, filter summaries, selections and Tab 5 scope/coverage text. Recorded this as the default in design.md and superseded the earlier overview coverage-line requirement.
- Affected: components/shell.ts, overview/view.ts, compliance/view.ts, dashboard/styles.css, rebuilt dashboard/app.js/app.css, existing overview-missing/compliance browser assertions and design.md. No data, pipeline or metric changes.
- Validation: strict TypeScript/Vite build, all 42 unit/data/model tests and all 25 focused compliance/overview-missing/health Edge browser checks pass on both development and production preview. A layout diagnostic verifies all three tabs at 375/1440px, both themes and open/closed filters: visible 1px divider, spacing, preserved summaries, removed text, no page overflow, and no divider on a tab without filters. Reviewed production desktop/mobile captures. Basemap requests were blocked; the unrelated legacy full browser suite was not rerun. git diff --check passes. No commit or push.

## 12 November 2026 - Compare age-group admissions against selected-period baselines

- Added the full-width Perubahan Admisi Balita & Lansia panel to Tab 5 after the existing analytical pair. User chose each age/facility's selected-period average as baseline. Displays grouped signed percentage changes across five facility-relative exposure groups, with a named age legend, zero-inclusive axis, actual exposure/count tooltips, screen-reader alternatives and explicit insufficient-data state. The panel follows station dimensions/date/pollutant/QC and remains independent of the health outcome selector.
- Baselines retain all selected days with both age outcomes available, including days without AQMS exposure. Form exposure groups only from same-day age/exposure triples. Require ≥30 paired days, positive baseline for both ages and all five groups nonempty; use nearest-rank cumulative 20/40/60/80% cutoffs, keep tied concentrations together and the same eligible facilities across all groups. Normalize within each facility/age before equal-weight averaging across facilities. These are descriptive comparison rules, not changes to source/QC eligibility. Initial PM2.5 VALID scope includes 25/27 facilities. No imputation, adjusted risk/model, event-study or conclusion of population vulnerability added.
- Added feature-owned calculation/chart modules, reused existing health exports and chart lifecycle, and preserved existing health summaries/plots. Extended methodology, design.md and CASE_STUDY_CONTEXT.md with baseline formula, cohort rules, effective counts and interpretation limits. Affected: health/age-comparison.ts, age-comparison-chart.ts, view.ts, components/methodology.ts, generated dashboard/app.js, new model tests and updated health browser checks. No raw data, analytical exports or pipeline changes.
- Validation: strict TypeScript/Vite build and all 45 unit/data/model checks pass, including three new tests for normalization, fixed cohorts, full-period baselines with missing exposure, zero/constant/short/empty scopes, QC/pollutant effects and actual missing data. All ten health browser checks pass on development; all 26 health/compliance/overview-missing checks pass on production. Added browser coverage for independent outcome selection, filter/QC updates, reused canvas and missing/short scopes; existing tests cover theme, motion, responsive layout and repeated teardown.
- Independently reconstructed default PM2.5 exposures and age baselines/groups from all raw AQMS/health files; eligible facility counts, baseline facility-days/rates and all five plotted groups match the frontend calculation. Reviewed 1440/375/320px light/dark captures and actual canvas tooltip rendering without page overflow. Visual inspection caught an initially absent legend; registered Chart.js Legend and repeated relevant browser/visual checks successfully. Basemap requests were blocked in regression checks; no adjusted statistical/causal model or unrelated legacy full-suite validation claimed. git diff --check passes; no commit or push.

## 12 November 2026 - Remove the health facility/period/pollutant/QC summary line

- Removed only the top-level Tab 5 scope sentence, its DOM/update code, unused period formatter and associated CSS. Preserved filter badges/divider, all five charts, paired-day coverage and the age-comparison baseline/cohort summary. Updated existing browser assertions to check retained filter badges and absence of the removed node. Recorded the superseding copy decision in design.md.
- Affected: health/view.ts, dashboard/styles.css, generated dashboard/app.js/app.css, existing health browser checks and design.md. Validation: strict TypeScript/Vite build and all 45 unit/data/model checks pass. Three focused health browser checks pass on both development and production: removed text, route/refresh, health outcome selection, persistent filter summaries/canvases and responsive layouts. Full browser suite not rerun; no data or calculations changed, commit or push.

## 13 November 2026 - Repair committed merge-conflict artifacts and verify the integrated build

- Removed committed conflict markers from temporal/drivers feature entries, retaining the implemented loaders/views/retry/teardown instead of obsolete placeholders. Preserved both documentation histories while resolving their markers. Resolved the download notebook without changing its executable code or running downloads.
- Restored the overview ETL's previously approved shared particulate/gas normalization from local commit 3cf0f97 and combined it with the incoming root/notebooks path detection. Executed the notebook and regenerated both overview JSON copies rather than selecting or editing numerical records by hand. The regenerated payload matches the approved local export exactly apart from generated_at. Preserved the older overview completeness rule and its documented limitations; this repair does not migrate analytical rules for other tabs.
- Rebuilt app.js/app.css from the combined source. Backed up all ten directly affected files before repair under test-results/conflict-repair-backup-20261113-094911-WIB; the preceding pull/build backup also preserves the user's initial three dirty files. No raw records, Git history, staged state or remote commits were changed.
- Updated three health navigation assertions that assumed Pola Waktu had no canvas: check removal of health-owned canvases and confirm the functional temporal view mounts. Initial production regression checks exposed two obsolete assertions; after this correction the complete focused rerun passes. Affected: temporal/index.ts, drivers/index.ts, overview JSON copies, ETL/download notebooks, generated bundles, existing health browser tests and design.md.
- Validation: strict TypeScript/Vite build and the final strict type check pass; all 56 TypeScript unit/data/model tests and all six Python export/normalization checks pass. All ten health Edge checks pass on Vite development, and all 26 compliance/health/overview-missing checks pass on production preview. An additional browser smoke check opens and refreshes all six canonical routes on both servers, verifies cross-tab teardown without uncaught JavaScript errors, and confirms Tab 3/4 page widths fit 375/1440px. Reviewed the production temporal capture. Basemap requests were blocked during browser checks; unrelated legacy full-browser and statistical audits of Tab 3/4 were not run.
- Validated both notebook schemas and successful execution of all ETL code cells. Dashboard/dataset/dist overview exports are byte-identical, and a scan finds no remaining conflict-marker lines in tracked source, data, notebooks or documentation. git diff --check passes. No commit or push.

## 13 November 2026 - Align Tab 3 and Tab 4 with the shared dashboard appearance

- Standardized panel spacing, responsive four/two/one-column KPI cards, wrapping labels, segmented mode controls, station toggles and searchable field widths. Shortened panel headings while preserving units and moved existing detailed explanations into collapsed disclosures. Wind roses now reflow across screen sizes; extreme-condition plots stack on narrower screens and episode plots keep readable row heights.
- Improved chart text and dark-theme contrast. Rebuilt the custom matrix presentation with device-pixel-ratio rendering, themed tooltips, legends and full textual value alternatives. All three correlation columns fit phones; the 24-hour matrix retains readable cells through keyboard-operable internal horizontal scrolling. Traffic site-type legend buttons retain visibility selection in a collapsed disclosure below the plot.
- Reused shared Chart.js lifecycle handling and added reusable analysis controls, matrix surfaces and custom-canvas lifecycle helpers. Mode/station/theme/motion updates retain chart instances; CSS hot updates redraw custom canvases and refresh chart styling. Feature teardown aborts owned interaction listeners and removes observers. Preserved existing analytical exports, models, calculations, thresholds and default selections; no analytical-pipeline migration is part of this visual change.
- Affected: temporal/view.ts and charts.ts, drivers/view.ts and charts.ts, shared/analysis-controls.ts, canvas-lifecycle.ts and matrix-surface.ts, dashboard/styles.css, generated app.js/app.css, tests/browser/analysis-appearance.spec.ts and design.md. Earlier unrelated worktree changes remain intact.
- Validation: strict TypeScript/Vite build and all 56 TypeScript unit/data/model tests pass. Four new Edge appearance/interaction checks pass on development; all 30 focused appearance/compliance/health/overview-missing checks pass on production preview. Rebuilt after the final cell-contrast adjustment and reran the four affected production checks successfully. Checks cover 320/375/768/1024/1440px, both themes, no page overflow, card text, mobile control sizing, matrix scrolling/tooltips at device scale 2, selection updates, retained canvases and live reduced-motion changes. An actual CSS edit confirmed Vite hot updates, matrix redraw and retained chart canvas; restored the exact stylesheet afterward. Reviewed final production desktop/mobile captures. Basemap requests were blocked in regression checks; unrelated legacy browser checks and a statistical audit of existing Tab 3/4 exports were not run. git diff --check passes. No commit or push.

## 13 November 2026 - Show filters on all tabs and group Tab 3/4 KPI cards

- Applied the user's clarification: all six tab routes now show the shared collapsed filter disclosure and its divider. Added explicit scope handling so unsupported Tabs 3/4/6 retain saved summary badges, show that global filters do not apply, and disable filter inputs/reset through a native fieldset. Re-enable controls on supported Tabs 1/2/5 without clearing choices. Set scope after asynchronous filter creation as well as navigation; keep the not-found page free of filters.
- Wrapped each Tab 3/4 KPI group in one standard titled summary panel. Removed their separate card typography/header-height overrides so padding, radius, minimum height and value type match Tab 2. Retained wrapped text and responsive columns. No data, calculation, local chart selection or analytical filtering pipeline changes.
- Affected: components/shell.ts and filters.ts, main.ts, temporal/view.ts, drivers/view.ts, dashboard/styles.css, generated app.js/app.css, tests/browser/analysis-appearance.spec.ts and design.md. Updated the active design contract and recorded the superseding decisions without deleting earlier history.
- Validation: strict TypeScript/Vite build and all 56 unit/data/model tests pass. All five appearance/interaction Edge checks pass on development, and all 31 focused appearance/compliance/health/overview-missing checks pass on production. Added coverage for visible filters/dividers across six tabs, default collapsed state, preserved badges, disabled/restored controls and four KPI cards in one summary. A final focused production rerun also verifies card geometry/value typography against Tab 2. Existing responsive checks cover 320–1440px in both themes; reviewed the updated mobile capture. An initial new-test failure compared rendered line breaks to concatenated text; corrected the assertion to compare individual badges and reran successfully. No unrelated legacy full-suite or statistical audit; git diff --check passes. No commit or push.

## 13 November 2026 - Make global filters primary and functional on Tabs 3 and 4

- User explicitly required live primary filters, superseding the preceding disabled-control implementation. All six tabs now accept and retain shared selections. Tab 3/4 KPIs and charts respond to region, station, site type, dates, all six pollutants and VALID/VALID+SUSPECT; Tab 6 honestly retains its unavailable analysis while allowing selection changes. Removed competing local station/zone/pollutant selectors; seasonal and episode display controls remain within the global scope. Preserved existing Tab 1/2/5 analytical behavior.
- Replaced fixed Tab 3/4 all-period JSON/loaders/exporters with reproducible normalized hourly shards from export-hourly.py. Reused production record/value eligibility through eligible_values in export-compliance.py and the approved unit-normalization policy. Exported both QC modes for all 27 stations, with source/shard checksums, explicit missing cells and sequential rejection reports distinct from absent raw hours. Kept raw observations unchanged. The hourly folder is approximately 24.6 MB across both modes; a request loads only selected station/mode shards with bounded concurrency, validates them and computes in a worker. A newer request/navigation terminates obsolete work; completed updates reuse charts.
- Tab 3 now pools selected hourly observations for profiles/day-hour medians and displays all selected station daily means. Episodes use correct daily-reference periods, including CO/O3's 13-of-17 complete eight-hour windows; missing days split episodes. Removed inappropriate PM2.5-only labels/reference lines from other pollutant selections and used a relative concentration color scale for the hourly matrix. Tab 4 recomputes selected-pollutant roses, pooled hourly Spearman pairs, wind bins, traffic means and P95/extreme summaries. Preserved original example stations when eligible; narrowed selections determine the actual rose examples. Explained pooled-station confounding, missing weather and master traffic scope in methodology. Old default results can change because the previous Tab 3/4 pipelines did not share approved normalization/eligibility; no causality or adjusted model was added.
- Retained the grouped KPI containers, responsive controls and shared theme/motion lifecycle. Added collapsed keyboard-operable series legends for all selected daily series/site types to prevent legend clipping, and corrected scatter tooltip lookup for grouped/filtered points. Missing sector/weather values stay unavailable instead of zero. Bundled the worker under /dashboard/assets/ for synchronized static export support. Updated methodology and design.md; centralized the unchanged regulatory reference definitions in shared/pollutants.ts for reuse.
- Affected: main.ts, shared filter/methodology components, data/hourly.ts and analysis-worker.ts, temporal/drivers modules, shared/filtered-analysis.ts, series-legend.ts and pollutants.ts, scripts/export-hourly.py and export-compliance.py, generated hourly folders/bundles, package.json, vite.config.ts and focused tests. Removed obsolete fixed Tab 3/4 loaders/exports/export scripts and their old snapshot tests. No dependency changes or lockfile edits. Existing unrelated worktree changes were preserved.
- Validation: strict TypeScript/Vite build, all 53 current TypeScript unit/data/model checks and all eight Python checks pass. New tests independently reconstruct daily means and complete eight-hour maxima from every hourly shard across all 27 stations, six pollutants, both QC modes and the full 1018-day calendar; values and missing positions match the production compliance export. Existing compliance export regeneration produced identical JSON; the only byte difference was newline translation, restored from the pre-check production snapshot. Notebook filtering rules and existing daily analytical exports remain unchanged.
- Six focused Edge checks pass on development; all 32 focused appearance/compliance/health/overview-missing checks pass on production, followed by affected checks after final legend/availability changes. Coverage includes actual KPI/chart updates, region/site/station/date/pollutant/QC scope, retained charts, retry, missing observations, cancellation/navigation, route refresh, summary grouping, mobile widths and both themes. A real CSS edit verifies Vite HMR, matrix redraw and retained canvas; the original stylesheet was restored exactly. Reviewed production/mobile captures; the initial many-series wind legend required the collapsed legend correction. An initial checksum failure exposed automatic HTTP decoding of .gz files; explicit .bin transport fixes it and checksums now verify before decompression. No unrelated legacy full-suite, adjusted statistical model or recommendation analysis validation claimed. git diff --check passes; no commit or push.
- Final build passes after the guarded nullable dataset updates. Direct access and refresh of all six canonical routes pass on both development and production; cross-tab teardown produces no uncaught JavaScript errors and Tab 3/4 widths remain contained at 375/1440px. All 27 saved rejection reports balance without double-counting stages, source/presentation/production hourly files are byte-identical, and the synchronized static worker asset exists. Reviewed the final mobile wind plot after moving its many-series legend below the plotting area.


## 13 November 2026 - Prepare and cache Tab 3/4 results at dashboard startup

- Added an application-owned analysis cache that starts preparation after the common dashboard data loads and when effective filters change, including on other tabs. One worker loads the selected hourly data once and computes both existing feature aggregations. Startup and tab consumers share the same pending calculation; tab navigation preserves it and completed results. Matching cached results render synchronously without another loading state, hourly request or worker.
- Cache holds only the latest filter scope/result pair in session memory. Keys include region, station, site type, dates, pollutant and QC; equivalent preset labels/default optional values do not cause redundant work. New filters cancel obsolete work and ignore late completions. Failed work can retry; application teardown clears the cache and worker. Navigation still removes charts/listeners and prevents removed views from rendering late. Opening the tab before initial preparation finishes waits for that same job; browser refresh starts a fresh session. Preserved the normal opening/skip behavior and other tabs' availability during preparation.
- Affected: new data/analysis-cache.ts, shared/filtered-analysis.ts, data/analysis-worker.ts and hourly.ts, main.ts, temporal/drivers entry modules, generated app.js/worker bundle, new cache unit/browser checks, three health navigation assertions and design.md. No formula, dataset, export, metric interpretation, styling, dependency or persistent-storage changes.
- Validation: strict TypeScript/Vite production build, final type check and all 57 unit/data/model checks pass. Four new unit checks cover pending/result reuse, every effective filter key, bounded latest-scope retention, cancellation/late results, retry and disposal. Six existing appearance/interaction checks and two new cache checks pass on development; browser instrumentation verifies startup from the overview, no repeated requests/workers on navigation, background recomputation after filter changes and shared pending work during early tab visits. Initial instrumentation assertions used the wrong HTML attribute spelling; corrected those test-only assertions and reran both cache checks successfully.
- All 34 focused production browser cases pass across the full run and focused reruns. Three older health-navigation checks initially exceeded their five-second cold-start expectation while the combined preparation was still running. Updated only those waits to allow the initial preparation; repeated visits retain the original five-second bound. All three pass on both development and production, preserving teardown/no-detached-paint assertions. No broader legacy suite or Python pipeline rerun was needed because calculations/exports are unchanged. git diff --check passes; no commit or push.

## 13 November 2026 — Tooltip completeness pass across all six tabs

- User asked for a tooltip on every visualization so unclear values decode on hover without cluttering the visuals. Audited all six tabs: most charts already had unit-aware tooltips and both custom canvas matrices already floating hover tooltips; maps already had hover tooltips plus click popups.
- Fixed the real gaps: expansion-rank bar now explains score/100 with baseline PM2.5, traffic and nearest-station distance; policy map hover adds city and nearest distance; Tab 2 bar tooltips normalize "Name (unit): value" into "Name: value unit" (e.g. "Tidak Sehat: 12%", "PM2.5: 102,1 µg/m³"); overview doughnut tooltip adds the share percentage.
- Affected `features/compliance/charts.ts`, `features/recommendations/network-view.ts`, `features/recommendations/map.ts`, `shared/charts.ts`, plus design.md decision log.
- Validation: typecheck, 64/64 unit tests, strict production build, and the full browser suite pass.

## 13 November 2026 — Wrap the Tab 5 indicator control in a container

- User confirmed origin/main is current (`879cd87`, already up to date) and required filter/selection controls to live inside a visible container. The `Indikator kesehatan` selector and its orientation copy now sit in a panel-styled container (surface background, border, 14px radius, shadow, 14px/20px padding) instead of floating on the page background.
- Affected `dashboard/styles.css` (`.health-toolbar`, desktop and phone layouts unchanged in behavior) plus this log and the design.md decision record.
- Validation: typecheck, 64/64 unit tests, strict build, full browser suite 84/84, and a rendered screenshot of the health toolbar.

## 13 November 2026 — Restore teammate's period-baseline age comparison (P1–P5)

- User rejected the fixed-2024 age baseline as inconsistent with the global date filter (every other panel follows the selected period) and asked to restore their teammate's approach from commit `734acd1`.
- Restored `age-comparison.ts`, `age-comparison-chart.ts` and `tests/health-age-comparison.test.ts` from `734acd1`. Tab 5 panel is again `Perubahan Admisi Balita & Lansia`: baseline = each age's mean over all selected dates (≥30 paired days, positive baselines, exposure-less dates retained), pairs split into five within-facility P1–P5 relative exposure quintiles, equal-facility average percent change, respiratory ages only, independent of the indicator selector. The teammate's test fixture gained the now-required `references` field.
- Removed the superseded fixed-2024 `AgeContrast` computation from `insights.ts`/`types.ts`/`view.ts` and its case-study assertions. Methodology, CASE_TAB_5_6_AUDIT table, health.spec expectations (canvas `health-age-comparison`, painted labels Balita/Lansia/P1/P5) and the design.md decision log updated; this supersedes the case-study alignment entry's fixed-2024 age instruction while the 12 November period-baseline entry stands again.
- Session work (Tab 6 simulator removal, dose/episode rework, tooltip pass, toolbar container) was restored from `stash@{0}` onto main in the same working tree; origin/main was confirmed current at `879cd87` before the switch.
- Validation: `tsc --noEmit` clean, all 67 unit tests pass (64 existing + 3 restored age-comparison tests), strict production build passes, and the full browser suite passes 84/84 including the rewritten painted-label and visibility checks for the restored canvas.

## 13 November 2026 — Load all tab data during the opening screen

- User feedback: every tab showed its own "Memuat…" despite the opening loading screen. Extended the collaborator's health-loader cache pattern (commit 5eef89b) app-wide: compliance now caches at module level, `preloadNetwork` warms network_rank, and `main.ts` loads dashboard + compliance + health + policy + network together under the opening screen via `Promise.allSettled` (only the dashboard export is critical). Warm caches resolve in a microtask, so tabs never paint their own loaders on first or repeat visits.
- Tab 3/4 hourly shards (24 MB) remain on-demand by design (selected stations/QC, max four concurrent requests); `filtered-analysis` now serves repeat requests from a bounded six-entry result LRU without spawning a worker, so revisits render instantly.
- The doughnut animation browser check now requires distinct pixel counts across `running` frames instead of "after > during": the rotation settles coverage downward (4024→3948 measured), and the old direction-dependent check raced against the shifted boot timing.
- Affected `main.ts`, `features/compliance/{load,index}.ts`, `features/recommendations/{index,network-view}.ts`, `shared/filtered-analysis.ts`, `tests/browser/dashboard.spec.ts`, plus this log and the design.md decision record.
- Validation: `tsc --noEmit` clean, 67/67 unit tests, strict production build, dashboard browser spec 31/31 (full suite run before push noted in the commit message).


## 13 November 2026 — Grounded AI chat (RAG) with OpenAI-compatible Vercel API

- Added `api/chat.ts`: Vercel serverless + Vite dev middleware (`/api/chat`), OpenAI-compatible `chat/completions` with `OPENAI_API_KEY`/`OPENAI_BASE_URL`/`OPENAI_MODEL` read only from environment (local `.env` via `loadEnv`, Vercel dashboard in production). Guardrails: strict payload validation, system prompt restricted to retrieved context with mandatory "data tidak tersedia", injection refusal, fail-closed 503 without key, sanitized 502/504 upstream errors, 30s timeout, reply cap.
- RAG digest: `scripts/export-chat-index.py` + `npm run data:chat-index` distills tab1 KPIs, per-station values, compliance, health and policy exports into seven reviewed chunks (`api/rag-index.json`, 12KB, bundled). Retrieval always includes the core scope chunk and ranks word-boundary term matches.
- UI: app-level fixed launcher icon (bottom-right) with right-side drawer that stays mounted across tab changes; message log; edit-and-resend truncates and regenerates from the edited message; conversations persisted in IndexedDB (`prana-chat`) with validation and an explicit unavailable-storage notice; Escape/close focus handling; full-width drawer under 767px; reduced-motion honored. New `chat` icon added to shared icons.
- Added `.env.example` and local `.env` (gitignored) for key entry; `api/**` added to tsconfig.
- Validation: typecheck clean, 79/79 unit tests (new `tests/rag.test.ts`: retrieval ranking, tokenizer, input validation, fail-closed key handling, OpenAI-compatible request shape with stubbed fetch), strict build, live dev-server smoke (503 without key, 400 injected role) and a browser script covering launcher, drawer, tab-switch persistence, send/error display, edit flow and IndexedDB restore after reload. Live model reply awaits the API key in `.env`.

## 13 November 2026 — Chat drawer squeezes layout; bigger launcher with teaser popup

- The open chat drawer now pushes the app column instead of covering it: `body.chat-open` sets a 400px right margin on `#app` (animated alongside the drawer, none under 767px where the drawer is full-width), so charts, tables and header reflow into the remaining width — verified `margin-right 0 → 400 → 0` across open/close/Escape.
- Launcher enlarged to 58px with a 27px icon, plus an occasional teaser bubble ("Punya pertanyaan tentang data? Tanya Asisten AI.") that appears 8s after load and then every 60s for 6s until the first open, then never again; clicking it opens the drawer. Teaser is pointer-only decoration (aria-hidden) — the launcher stays the accessible control.
- Fixed close-path split-brain: the drawer's close button/Escape now route through the single `setOpen` toggle (previously they missed the body class, leaving the squeeze stuck open), and focus lands on the composer via double-rAF after the visibility transition (Escape requires focus inside the drawer).
- Validation: typecheck, 79/79 unit tests, strict build, browser script covering squeeze margins, teaser timing, focus target, Escape and close-button paths; screenshots captured.

## 13 November 2026 — Remove squeeze-animation jank from the chat drawer

- The open-close lag came from animating `margin-right` on `#app`: every frame reflowed the whole layout and resized every Chart.js canvas and the Leaflet map for 280ms. The margin now snaps without a transition, staged so the user never sees it move: opening slides the drawer first and applies the 400px squeeze once the slide settles (the snap happens behind the drawer, where charts resize exactly once); closing removes the squeeze immediately (also behind the drawer) before it slides away. Pending squeeze timers are cleared on rapid toggle so the layout can never get stuck; reduced motion applies the squeeze immediately.
- Affected `dashboard/styles.css` and `features/chat/index.ts`; CHANGELOG and design.md decision log updated.
- Validation: typecheck, 79/79 unit tests, strict build, and a browser timing script (margin 0 during slide → 400 after settle → 0 on close → not stuck after rapid open/Escape → 400 with composer focus on reopen).

## 13 November 2026 — Remove sidebar-collapse jank (same reflow storm as the chat squeeze)

- Collapsing/expanding the sidebar lagged because `.app-layout` animated `grid-template-columns` for 360ms: every frame changed the main column width, so Chart.js's internal ResizeObserver re-rendered every chart and both Leaflet ResizeObservers called `invalidateSize` 60x/sec (health tab: 7 charts + map). The column transition is removed — the grid snaps once and each chart/map resizes exactly once. The sidebar keeps its cheap inner motion (padding fade, nav-label max-width/opacity, brand-wordmark fade, chevron rotation), so the collapse still animates where it is visible and costs nothing.
- Affected `dashboard/styles.css` (`.app-layout`) plus this log and the design.md decision record.
- Validation: typecheck, 79/79 unit tests, strict build, and a browser probe counting distinct doughnut canvas widths across a collapse+expand cycle: exactly 2 (one per toggle) instead of dozens of per-frame intermediates.

## 13 November 2026 — Pull Tab 4 improvements; smooth layout-follow for chat and sidebar

- Pulled origin/main (`0c1a19c`, `2ba5401`, `d856982` — Tab 4 upgrade, visual consistency pass, analysis-cache work) as a fast-forward. Stashed local uncommitted work first; the pop conflicted in three files: `dashboard/app.css` and `dashboard/app.js` (generated — took the pulled build, rebuilt afterwards) and `design.md` (kept both sides: the collaborator's Tab 4 upgrade entry plus the chat/perf entries). Stash dropped after successful application.
- Finished the smoothness fix the user asked for (the instant snaps felt "too fast" and the staged chat squeeze didn't follow the drawer): new `shared/layout-follow.ts` freezes chart/map resizes for the duration of a layout animation. `.app-layout` grid transition (360ms) and `#app` margin transition (280ms) are restored, so the sidebar collapse and the chat squeeze animate in sync again; during the window `body.layout-follow` stretches Chart.js canvases via CSS (`width/height: 100%`) so they visibly follow, panels clip frozen overflow, Chart.js `resize` is shadowed per instance (`pauseChartResize`/`resumeChartResize` in chart-lifecycle, wired into begin/end — the earlier attempt failed because nothing invoked the pause), and both Leaflet ResizeObservers are gated with a one-shot invalidate on end. A single-slot scheduler prevents depth leaks on rapid toggles.
- Verification: every motion (chat open, chat close, rail collapse) shows exactly **2 distinct canvas widths** (frozen start → one resize at end) instead of 5–19 per-frame intermediates, while `gridTemplateColumns`/`margin-right` show interpolated mid-animation values (e.g. grid at 85.5px mid-collapse, margin at 381px mid-open) — smooth and jank-free. Rapid toggle settles with no stuck classes.
- Validation: typecheck clean, 83/83 unit tests (including the pulled analysis-cache suite), strict production build, browser suite 83 passed / 4 failed — `analysis-appearance.spec` (2) and `development.spec` HMR (2) fail identically on the pulled commit `d856982` itself in a pristine worktree (pre-existing, not merge regressions; pristine fails 3, merged fails 2).

## 13 November 2026 — Chat: pen-icon inline editing; live API verified

- Replaced the text "Ubah" button with an icon-only pen button (`pen`/`check` icons added to shared icons) and moved editing **into the message bubble**: clicking the pen swaps that bubble for an inline textarea with confirm (✓, re-sends and truncates the thread after the message) and cancel (×) controls; Enter confirms, Shift+Enter adds a newline, Escape cancels without closing the drawer. The bottom composer is now only for new messages (send disabled while editing). Fixed a delegation bug where icon-only buttons never fired: clicks land on SVG children, so the handler now tests `instanceof Element` instead of `HTMLElement`. Model replies render `**bold**` markers as `<strong>` via safe DOM appends (no innerHTML).
- `OPENAI_BASE_URL` tolerance: providers whose base already ends with `/chat/completions` (e.g. OpenRouter) no longer get the path appended twice.
- Live API verification with the provided key (OpenRouter, ernie-5.5-flash): grounded question returned exact index values (43,25 µg/m³, 17,7%, AQMS-BJB-01, 102,14, 40,1%); fake station `AQMS-XYZ-99` and off-topic recipes answered "data tidak tersedia"; an injection asking for the API key was refused. Browser run with live replies: send → grounded reply, pen → inline edit → cancel restores, confirm → thread truncates to 1+1 with a fresh grounded reply, conversation persists across reload. Screenshots captured (`test-results/chat-inline-edit.png`, `chat-live-reply.png`).
- Validation: typecheck clean, 83/83 unit tests, strict build.

## 13 November 2026 — Chat history, hover pen with save/resume, streaming, visualization knowledge

- **Conversation history**: multiple conversations in IndexedDB (new `listConversations`/`putConversation`/`deleteConversation` with runtime validation and legacy single-record migration). Header gains a history toggle (clock) and a new-chat button (plus); the history view lists conversations with auto-titles from the first user message, date and message count, current-conversation highlight, inline rename (pen → input → ✓/×) and two-step delete (trash → "Hapus percakapan ini?" → ✓/×). Last-open conversation is remembered via localStorage; deleting the open conversation falls back to the newest or a fresh one.
- **Hover-only pen**: the edit pen now fades in on message hover (`opacity 0 → 1`), stays keyboard-revealing via `:focus-visible`, and is always visible on touch devices (`hover: none`/`pointer: coarse`). Verified computed opacity 0 → 1 on hover.
- **Save vs Resume**: inline edit actions are now three compact 34×34 buttons (44px on coarse pointers — fixes the oversized ×/✓ complaint): ✓ **simpan** (updates the text and truncates the now-stale reply without an API call), ▶ **lanjutkan** (saves and re-requests from that point — the resume action), × **batal**. Verified live: save leaves 1 user/0 assistant; resume produces a fresh grounded reply.
- **Streaming**: `/api/chat` accepts `stream: true` and pipes the upstream OpenAI-compatible SSE as `data: {"delta":…}` events terminated by `[DONE]`, with disconnect-safe writes (client abort mid-stream can no longer throw in the server), a JSON fallback for providers that ignore `stream: true`, and a client reader that appends deltas incrementally (rAF-coalesced repaint). The chosen free model buffers its reply into one chunk, so arrival may look atomic with it; the transport is real SSE (verified via curl) and streaming-native models will type incrementally. Fixed: the empty streaming placeholder was included in the outbound payload and tripped API validation (400).
- **Visualization knowledge**: `scripts/export-chat-index.py` now emits three reviewed chunks describing what every tab and chart does (Ikhtisar/Kepatuhan, Pola Waktu/Faktor Pemicu, Dampak Kesehatan/Rekomendasi) — index now 10 chunks, 14.9KB. Live probe: "Apa fungsi grafik Profil Polusi per Jam…?" answered correctly from the new chunks.
- Validation: typecheck clean, 84/84 unit tests (new SSE parser tests for both client and API formats), strict build, and a 12-step live browser run (send→reply, hover reveal, history+rename, new chat, reopen, edit buttons 34×34, save, resume, two-step delete, reload freshness) — all passing with the live API. Screenshots: `chat-history.png`, `chat-hover-pen.png`, `chat-edit-actions.png`.

## 13 November 2026 — Detailed how-to knowledge for the chat assistant

- The assistant's answer to "Bagaimana menggunakan Asumsi Kapasitas Manual?" was shallow because the index carried facts but no usage procedures. `scripts/export-chat-index.py` now emits four reviewed how-to chunks (14 chunks total, 20.5KB): step-by-step usage of the Manual Capacity simulator (panel location, filter effects, Rata-rata/P90 basis definition with the (n-1)×p interpolation, input ranges 0–200% and 0–100.000 beds, both formulas with an example equation, charts, reset, invalid-input behavior, complete-date basis, planning-assumption limits), global-filter usage with per-tab effects, Tab 2/3/5 controls (year select, partial-data checkbox, comparison modes, indicator selector scope), and Tab 4/6 controls (threshold mode, rose pickers + shared scale, normalized toggle, traffic pollutant/season toggles, expansion weight sliders, radius slider).
- Context budget raised 9000→12000 chars so how-to and data chunks fit together; system prompt now requires step-by-step answers (panel name, clicked controls, formulas, ranges, limits, up to ~300 words) for "cara menggunakan" questions while keeping ordinary answers ~150 words; `max_tokens` raised 700→1500 so long step lists are not cut mid-sentence (verified: the full 8-step answer plus limitations paragraph now completes at 1,778 chars).
- Validation: typecheck clean, 85/85 unit tests (new retrieval test proves how-to chunks are fetched for usage questions), strict build, and a live run of the exact question returning the complete detailed walkthrough.

## 13 November 2026 — Prana emblem thinking indicator; resizable and fullscreen chat drawer

- Clarified scope from the user: the Prana emblem replaces the typing text's icon **while the assistant is thinking** (the launcher keeps its chat bubble). The `chat-typing` row now shows `Prana Emblem.png` (same asset path pattern as the shell logos) pulsing beside "Asisten mengetik…", visible from send until the first token; reduced-motion disables the pulse via the global rule.
- The drawer is now **resizable**: a 10px left-edge handle (role=separator, keyboard ArrowLeft/ArrowRight ±16px, Shift ±48px) drags the width between 320px and min(900px, viewport−360). Width drives a `--chat-width` CSS variable consumed by both `.chat-drawer` and `body.chat-open #app`, so the squeeze tracks the drag exactly (verified 400→605px drawer and margin), persists in `localStorage` (`prana-chat-width`, restored on load), freezes chart/map resizes via `layout-follow` for the whole drag (verified active during, cleared 320ms after), and disables transitions while dragging (`.chat-resizing`).
- The drawer is now **fullscreen-able**: a new expand/compress header toggle switches `.is-fullscreen` (100vw) with `aria-pressed` and label swaps; Escape first exits fullscreen and only a second Escape closes the drawer (verified ladder: fullscreen → 605px open → closed). Resize handle and fullscreen toggle hide under 767px where the drawer is already full-width. Long conversation titles ellipsize in the header.
- New icons `expand`/`compress` added to shared icons. Validation: typecheck clean, 85/85 unit tests, strict build, 7-step browser run (emblem visible + screenshot, drag with layout-follow, persistence across reload, fullscreen, Escape ladder) — all passing. Screenshots: `chat-typing-emblem.png`, `chat-resized.png`, `chat-fullscreen.png`.

## 14 November 2026 — Root URL redirects to the overview on Vercel

- Visiting `https://gelar-rasa.vercel.app/` served the app (rewrite worked) but stayed on path `/`, which the client router correctly renders as "Halaman tidak ditemukan" — `/` is not a canonical route and unknown paths must keep 404ing. The dev server 308s `/` → `/dashboard`; `vercel.json` now uses a permanent **redirect** instead of a rewrite so the URL canonicalizes server-side, and `main.ts` mirrors that with a client-side `history.replaceState('/dashboard')` fallback for any other static host that serves `/` without middleware. Deep-link 404 behavior for unknown paths is unchanged.
- Validation: typecheck clean, 85/85 unit tests, strict build.

## 14 November 2026 — Yearly RAG recaps; the chat can now edit filters and open tabs

- Why "2024 insight" answers failed: RAG can only retrieve what the index holds, and the index had full-period aggregates only. `scripts/export-chat-index.py` now emits two computed chunks from the real exports — `yearly-air` (per-year PM2.5 mean, pooled stasiun-hari exceedance %, most-critical/lowest station within the official 1 Jan–14 Okt window for 2024/2025/2026) and `yearly-health` (per-year admissions means + burden per 100 beds) — plus the filter vocabulary (valid regions/siteTypes/pollutants) in the how-to-filters chunk. Also fixed a genuine inconsistency found during the audit: the health chunks' burden divided a per-faskes mean by total beds (0,40 instead of the dashboard's 11,47); both now use complete-day totals ÷ beds, matching the KPI. Index: 16 chunks, 23.4KB. Live: "jelaskan data di 2024" now returns 36,88 µg/m³, 16,0%, AQMS-BJB-01 81,72, AQMS-IDP-01 9,63, beban 10,90 — all exact.
- Chat actions (filter + navigation): system prompt rule 7 lets the model end replies with `[[FILTER: …]]` and `[[NAVIGASI: …]]` directives (only requested keys, values from context, with a few-shot example). New `features/chat/actions.ts` extracts and strips directives (Indonesian key aliases, route aliases, typed patch); the view applies them after the reply, shows "Filter diperbarui: …", and closes the drawer on navigation so the target tab is visible; invalid values surface an honest status instead of failing silently. `main.ts` bridges to `filters.apply(patch)` (catalog-validated region/site/station/pollutant/QC/preset/dates with control sync + publish) and `router.go`. Live model emitted both directives exactly; a deterministic browser spec intercepts `/api/chat` and verifies apply → navigate → drawer close → badges (Jakarta, NO2) → no `[[` in the bubble.
- Validation: typecheck clean, 87/87 unit tests (new yearly-retrieval and directive-parser tests), strict build, browser suite 83 passed — remaining failures are the previously verified pre-existing `analysis-appearance` ×2 and `development` HMR ×2 on the teammate's commit; the route-registry restart test was hardened with a 15s toPass window because config reload got slightly heavier (verified passing isolated and in-suite).

## 14 November 2026 — Faster first load: AVIF assets + single-file opening gate

- Images (user's `convert-files` bun CLI, `-f avif -q 80`, outputs moved from `assets/avif_files/` into `assets/`; ImageMagick for the favicon): Prana Emblem 727KB→67.9KB, Prana Textual 824KB→118KB, Logo GELAR RASA Open 1.02MB→160KB, Closed 603KB→90.5KB — opening visuals ~1.55MB→186KB with alpha and text verified crisp. The favicon was fetching the full 727KB emblem; it is now a dedicated 96px `Prana Favicon.png` (11.8KB). All references updated (entry.html, shell wordmark + both Gelar logos, chat typing emblem); entry.html preloads the two opening AVIFs with `fetchpriority="high"`. Original PNGs remain as sources.
- Data gate: previously the opening awaited allSettled of every export (~8.2MB of fetch+parse) before revealing. Now only `loadDashboard` (1.8MB, needed for the overview) gates first paint; compliance (3.6MB), health (2.3MB), policy and network warm in parallel BEHIND the opening animation. Loaders became single-flight (`cached` + in-flight promise join in compliance/health/policy/network) so an early tab click joins the warm request instead of duplicating fetch+parse. Measured in dev: opening gone at 1943ms with the content canvas painted in the same tick; production benefits further from gzip/HTTP2.
- Validation: typecheck clean, 87/87 unit tests, strict build (bundle verified: hashed AVIFs + favicon in `dist/dashboard/assets`, runtime AVIFs in `dist/assets`, entry refs rewritten), browser script verified every rendered image loads from AVIF with correct byte counts, dashboard+chat specs 32/32, full suite 84 passed — the 4 failures are the previously verified pre-existing `analysis-appearance` ×2 and `development` ×2 on the teammate's commit.

## 14 November 2026 — All tab data inside the loading screen (standing rule)

- User standing rule: every tab's export (including the hourly analysis for Pola Waktu/Faktor Pemicu) must finish loading inside the opening/loading screen — never lazily on tab click. `main.ts` now starts all five export fetches first, chains setup + `analysisCache.prepare` the moment tab1 lands (overlapping the warm fetches instead of running after them), and releases the opening through one barrier. Verified: tab clicks mount in ~150-210ms with zero loading states.
- Speed of the screen itself: cache writes no longer block parsing (background `cache.put` in the shared JSON loader and the hourly fetcher), the opening reveal is elapsed-based (850ms minimum total, immediate when data took longer — no fixed 1500ms sleep), the teammate's sessionStorage skip and Cache Storage reuse retained (reload: 0 hourly bytes re-fetched).
- Measured in dev: first load ~10s dominated by `analysisCache.prepare` compute (warm fetches finish in <1s; reload recomputes from cache with zero downloads). Production uses the static built worker instead of Vite's dev worker transform; the analysis compute itself remains the next optimization target.
- Validation: typecheck clean, 89/89 unit tests, strict build; browser suite skipped at the user's request to ship fast.
