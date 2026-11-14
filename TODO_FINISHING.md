# Agenda sesi finishing

Daftar ini berisi usulan untuk dibahas, bukan fitur yang sudah tersedia atau instruksi untuk langsung mengimplementasikannya.

## Mode data hasil imputasi

- [x] Bahas kelayakan opsi filter **Sertakan data hasil imputasi**.

Dibahas & diputuskan pada 14 November 2026 (WIB). Status: **Selesai dikaji — Ditolak/Tidak Diterapkan (*Rejected by Design*)**.

Keputusan:
Dashboard tetap mempertahankan kebijakan ketat **Nol-Imputasi (*Zero-Imputation Policy*)** di seluruh tab. Imputasi data tidak diterapkan karena:
1. **Integritas Baku Mutu Lingkungan**: Evaluasi kepatuhan hukum PP 22/2021 dan ISPU (Permen LHK 14/2020) mengaudit kualitas udara berbasis data observasi fisik riil; imputasi tidak diakui secara hukum untuk penetapan status kepatuhan.
2. **Defisit Data Ekstrem**: Celah data pada stasiun seperti `AQMS-JMB-02` (hanya aktif 5 hari dari 1.018 hari) terlalu panjang, sehingga imputasi akan berarti merekayasa 99,5% data stasiun tersebut secara semu.
3. **Mencegah Bias Analisis Lanjutan**: Imputasi data paparan berisiko merusak varians alami dan memicu korelasi artifisial pada analisis dampak kesehatan (Tab 5) serta memanipulasi durasi episode ekstrem (Tab 3).
4. **Kejujuran Data**: Melaporkan data hilang sebagai `null` / "Data tidak mencukupi" secara transparan merupakan pilar utama integritas ilmiah PRANA di hadapan dewan juri.

## Restrukturisasi Teks Metodologi Dashboard (Fokus Keputusan Analitis)

- [x] Perbarui teks modal/drawer Metodologi agar lebih mudah terbaca dan berfokus pada **keputusan teknis/analitis terapan (*analytical decisions*)**, bukan narasi proses atau riwayat audit masa lalu.

Dicatat & diimplementasikan 14 November 2026 (WIB). Status: **selesai diimplementasikan**. Modal metodologi kini terstruktur ke dalam kartu ringkasan cakupan data, 6 pilar keputusan analitis terapan, 7 langkah alur penyaringan bertingkat AQMS, serta jejak komputasi/provenance sumber data.

Tujuan: Menjadikan modal Metodologi transparan, otoritatif, ringkas, dan mudah dipahami pengambil kebijakan maupun dewan juri tanpa dibebani paragraf panjang (*wall of text*) atau catatan riwayat perbaikan bug internal.

Pilar keputusan yang akan diterapkan:
1. **Integritas Data & Kontrol Kualitas (QC)**: Default hanya menerima `VALID` (`SUSPECT` via opsi eksplisit), syarat validitas harian $\ge 18$ jam unik, kebijakan tanpa imputasi (*zero-imputation policy*).
2. **Standarisasi Satuan Instrumen**: Normalisasi partikulat ke $\mu\text{g}/\text{m}^3$ (faktor $\times 1.000$ untuk logger berskala mg/m³ di 3 stasiun) dan konversi molekuler gas pada kondisi referensi standar ($25^\circ\text{C}, 1\text{ atm}$).
3. **Kepatuhan Baku Mutu (PP 22/2021 & ISPU)**: Aturan 24 jam untuk PM2.5/PM10/SO2/NO2; Moving Average 8 jam harian untuk CO/O3 (min. 13/17 jendela); ambang kelengkapan evaluasi tahunan 75%; estimasi IKU stasiun adaptasi Permen LHK 27/2021.
4. **Analisis Dinamika Waktu & Faktor Pemicu (Tab 3 & 4)**: Dekomposisi varians ($\eta^2$ untuk faktor kategorik dan $R^2$ untuk cuaca kontinu); ambang batas ekstremitas P95; pemisahan musim karhutla (Agu–Okt) vs normal (Nov–Jul).
5. **Dampak Kesehatan & Tekanan Fasilitas Kesehatan (Tab 5)**: Korelasi jeda waktu Pearson lag 0–7 hari (syarat $\ge 30$ pasangan); stratifikasi respons 5 kuintil paparan (P1–P5); rasio tekanan tempat tidur RS = (Pernapasan + CVD) / Kapasitas $\times 100$.
6. **Pemodelan Kebijakan & Prioritas Ekspansi (Tab 6)**: Pemeringkatan wilayah baru berbasis normalisasi min-maks 3 kriteria (baseline polusi, volume lalu lintas, jarak tetangga terdekat); radius ilustrasi spasial (10–300 km).
