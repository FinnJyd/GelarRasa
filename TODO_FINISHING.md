# Agenda sesi finishing

Daftar ini berisi usulan untuk dibahas, bukan fitur yang sudah tersedia atau instruksi untuk langsung mengimplementasikannya.

## Mode data hasil imputasi

- [ ] Bahas kelayakan opsi filter **Sertakan data hasil imputasi**.

Dicatat 12 November 2026 (WIB). Status: **usulan, belum diimplementasikan**. Pipeline saat ini tetap tanpa imputasi. Persetujuan mencatat agenda ini bukan persetujuan untuk mengubah data atau perhitungan.

Tujuan: membandingkan hasil dari observasi yang lolos penyaringan dengan hasil yang turut memakai estimasi pada celah data, sehingga pengaruh data kosong dapat dipahami.

Arah awal untuk dibahas:

- Opsi terpisah dari QC dan Sertakan data parsial, dengan bawaan nonaktif. Mode nonaktif mempertahankan hasil observasi saat ini.
- Mode aktif hanya menambahkan estimasi pada celah yang memenuhi kebijakan imputasi; tidak menimpa observasi sah. Tentukan penyaringan QC sebelum imputasi dan perlakuan tiap jenis kegagalan, tanpa otomatis mengisi semua rekaman yang ditolak.
- Bedakan nilai/jam/hari observasi dengan hasil imputasi pada tooltip, tabel dan ringkasan cakupan. Imputasi tidak menaikkan angka kelengkapan observasi asli atau membuat estimasi dianggap jam terukur untuk syarat 18 jam.
- Hasil pelampauan yang menggunakan imputasi perlu diberi keterangan estimasi. Tetapkan penyebut observasi dan penyebut estimasi secara eksplisit; tentukan dampaknya terhadap jendela 8 jam, evaluasi tahunan, IKU dan analisis kesehatan sebelum diterapkan.

Keputusan yang perlu disepakati pada sesi finishing:

1. Metode per polutan, tingkat imputasi (jam/hari), panjang celah maksimum dan kecukupan data pembanding. Bahas secara khusus apakah stasiun sangat jarang terukur seperti JMB-02 layak diimputasi.
2. Validasi dengan menyembunyikan sebagian observasi sah, meniru pola celah yang relevan, lalu mengukur kesalahan, perubahan puncak polusi dan persentase pelampauan. Hindari kebocoran data pada evaluasi model dan analisis kesehatan.
3. Tab/analisis yang mendukung mode tersebut, interaksi dengan QC dan data parsial, serta penyajian ketidakpastian dan proporsi nilai imputasi.
4. Penyimpanan hasil dan penanda asal secara terpisah, jejak metode/parameter, pembaruan ekspor dan metodologi, serta pengujian bahwa mode nonaktif tetap menghasilkan angka observasi yang sama.

Acuan observasi yang harus tetap dipertahankan: [kontrak penyaringan](AGENTS.md#shared-aqms-filtering-contract) dan [notebook penyaringan Tab 2](notebooks/simulasi_penyaringan_tab2.ipynb). Implementasi baru dibahas setelah metode dan batas penggunaannya disepakati.

## Restrukturisasi Teks Metodologi Dashboard (Fokus Keputusan Analitis)

- [ ] Perbarui teks modal/drawer Metodologi agar lebih mudah terbaca dan berfokus pada **keputusan teknis/analitis terapan (*analytical decisions*)**, bukan narasi proses atau riwayat audit masa lalu.

Dicatat 14 November 2026 (WIB). Status: **diagendakan dalam todolist**.

Tujuan: Menjadikan modal Metodologi transparan, otoritatif, ringkas, dan mudah dipahami pengambil kebijakan maupun dewan juri tanpa dibebani paragraf panjang (*wall of text*) atau catatan riwayat perbaikan bug internal.

Pilar keputusan yang akan diterapkan:
1. **Integritas Data & Kontrol Kualitas (QC)**: Default hanya menerima `VALID` (`SUSPECT` via opsi eksplisit), syarat validitas harian $\ge 18$ jam unik, kebijakan tanpa imputasi (*zero-imputation policy*).
2. **Standarisasi Satuan Instrumen**: Normalisasi partikulat ke $\mu\text{g}/\text{m}^3$ (faktor $\times 1.000$ untuk logger berskala mg/m³ di 3 stasiun) dan konversi molekuler gas pada kondisi referensi standar ($25^\circ\text{C}, 1\text{ atm}$).
3. **Kepatuhan Baku Mutu (PP 22/2021 & ISPU)**: Aturan 24 jam untuk PM2.5/PM10/SO2/NO2; Moving Average 8 jam harian untuk CO/O3 (min. 13/17 jendela); ambang kelengkapan evaluasi tahunan 75%; estimasi IKU stasiun adaptasi Permen LHK 27/2021.
4. **Analisis Dinamika Waktu & Faktor Pemicu (Tab 3 & 4)**: Dekomposisi varians ($\eta^2$ untuk faktor kategorik dan $R^2$ untuk cuaca kontinu); ambang batas ekstremitas P95; pemisahan musim karhutla (Agu–Okt) vs normal (Nov–Jul).
5. **Dampak Kesehatan & Tekanan Fasilitas Kesehatan (Tab 5)**: Korelasi jeda waktu Pearson lag 0–7 hari (syarat $\ge 30$ pasangan); stratifikasi respons 5 kuintil paparan (P1–P5); rasio tekanan tempat tidur RS = (Pernapasan + CVD) / Kapasitas $\times 100$.
6. **Pemodelan Kebijakan & Prioritas Ekspansi (Tab 6)**: Pemeringkatan wilayah baru berbasis normalisasi min-maks 3 kriteria (baseline polusi, volume lalu lintas, jarak tetangga terdekat); radius ilustrasi spasial (10–300 km).
