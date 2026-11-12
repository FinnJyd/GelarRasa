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
