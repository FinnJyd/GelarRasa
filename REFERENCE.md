# Referensi Ilmiah, Regulasi, dan Metodologi Teknis
## DA2026 Dashboard Kualitas Udara & Dampak Kesehatan (PRANA)

Dokumen ini mendokumentasikan rujukan resmi, dasar hukum, landasan ilmiah meteorologi/klimatologi, serta formulasi konversi fisikokimia yang digunakan di dalam repositori analisis kualitas udara dan kesehatan ini.

---

## 1. Regulasi dan Standar Kualitas Udara Nasional

### 1.1 Baku Mutu Udara Ambien Nasional
* **Regulasi:** Peraturan Pemerintah Republik Indonesia No. 22 Tahun 2021 tentang Penyelenggaraan Perlindungan dan Pengelolaan Lingkungan Hidup.
* **Bagian Spesifik:** Lampiran VII — Baku Mutu Udara Ambien.
* **Nilai Ambang Batas Acuan:**

| Parameter Polutan | Waktu Pengukuran (Averaging Time) | Baku Mutu Nasional | Keterangan Metodologis |
| :--- | :--- | :--- | :--- |
| **$\text{PM}_{2.5}$** | 24 Jam | $55\ \mu\text{g/m}^3$ | Rata-rata aritmatika 24 jam (min. 18 jam valid) |
| | 1 Tahun | $15\ \mu\text{g/m}^3$ | Rata-rata harian dalam 1 tahun kalender (cakupan $\ge 75\%$) |
| **$\text{PM}_{10}$** | 24 Jam | $75\ \mu\text{g/m}^3$ | Rata-rata aritmatika 24 jam (min. 18 jam valid) |
| | 1 Tahun | $40\ \mu\text{g/m}^3$ | Rata-rata harian dalam 1 tahun kalender (cakupan $\ge 75\%$) |
| **$\text{SO}_2$** | 24 Jam | $75\ \mu\text{g/m}^3$ | Rata-rata aritmatika 24 jam (min. 18 jam valid) |
| | 1 Tahun | $45\ \mu\text{g/m}^3$ | Rata-rata harian dalam 1 tahun kalender (cakupan $\ge 75\%$) |
| **$\text{CO}$** | 8 Jam | $4.000\ \mu\text{g/m}^3$ | Maksimum dari jendela bergerak 8 jam (min. 13 dari 17 jendela lengkap) |
| | 1 Tahun | *Tidak Ada Acuan* | Regulasi tidak menetapkan ambang tahunan; status evaluasi tahunan dikosongkan |
| **$\text{O}_3$** | 8 Jam | $100\ \mu\text{g/m}^3$ | Maksimum dari jendela bergerak 8 jam (min. 13 dari 17 jendela lengkap) |
| | 1 Tahun | *Tidak Ada Acuan* | Regulasi tidak menetapkan ambang tahunan; status evaluasi tahunan dikosongkan |
| **$\text{NO}_2$** | 24 Jam | $65\ \mu\text{g/m}^3$ | Rata-rata aritmatika 24 jam (min. 18 jam valid) |
| | 1 Tahun | $50\ \mu\text{g/m}^3$ | Rata-rata harian dalam 1 tahun kalender (cakupan $\ge 75\%$) |

### 1.2 Indeks Standar Pencemar Udara (ISPU)
* **Regulasi:** Peraturan Menteri Lingkungan Hidup dan Kehutanan No. P.14/MENLHK/SETJEN/KUM.1/7/2020 tentang Indeks Standar Pencemar Udara.
* **Penerapan:** Penentuan rentang kategori mutu udara harian (*Baik*, *Sedang*, *Tidak Sehat*, *Sangat Tidak Sehat*, *Berbahaya*) pada Tab 1 dan Tab 2.

### 1.3 Indeks Kualitas Lingkungan Hidup (IKLH / IKU Udara)
* **Regulasi:** Peraturan Menteri Lingkungan Hidup dan Kehutanan No. 27 Tahun 2021 tentang Indeks Kualitas Lingkungan Hidup.
* **Formulasi IKU:**
  $$\text{IKU} = 100 - \left( \frac{50}{100} \times \left( \frac{\text{Konsentrasi } \text{SO}_2}{\text{Baku Mutu } \text{SO}_2} + \frac{\text{Konsentrasi } \text{NO}_2}{\text{Baku Mutu } \text{NO}_2} \right) \times 50 \right)$$
* **Penerapan:** Dihitung per stasiun dari pasangan observasi $\text{SO}_2$ dan $\text{NO}_2$ yang valid pada periode evaluasi yang sama.

---

## 2. Klimatologi dan Musim Kabut Asap (Karhutla Haze Season)

Periode **Agustus s.d. Oktober (Agu–Okt)** diklasifikasikan sebagai **Musim Karhutla / Haze Season** dengan landasan rujukan berikut:

### 2.1 Panduan Studi Kasus Kompetisi
* **Dokumen:** *Booklet Case Study DA Gelar Rasa 2026*, Halaman 2–3 (Bagian C.2).
* **Kutipan Ketentuan:**
  > *"Mengidentifikasi waktu dan wilayah dengan tingkat pencemaran yang paling kritis. Peserta diharapkan mampu menganalisis pola berdasarkan jam, hari kerja dan akhir pekan, serta musim, termasuk episode kabut asap akibat kebakaran hutan dan lahan gambut dengan membedakan karakteristik kawasan perkotaan, industri, dan latar bersih."*

### 2.2 Badan Meteorologi Spesialis Regional: ASEAN ASMC
* **Institusi:** *ASEAN Specialised Meteorological Centre* (ASMC) — Badan resmi ASEAN di bawah *ASEAN Agreement on Transboundary Haze Pollution*.
* **Rujukan:** *Regional Haze Action Plan & ASMC Seasonal Outlooks* ([asmc.asean.org](https://asmc.asean.org/)).
* **Ketetapan:**
  - Menetapkan periode **Juni–Oktober** sebagai *Southern ASEAN Dry Season* untuk kawasan Indonesia (Sumatra dan Kalimantan).
  - Puncak aktivitas kebakaran lahan gambut (*peatland fires*) dan kabut asap lintas batas (*transboundary haze*) secara konsisten memuncak pada **Agustus hingga Oktober**.

### 2.3 Badan Meteorologi Nasional (BMKG) & KLHK
* **BMKG (Kedeputian Bidang Klimatologi):** Publikasi *Prakiraan Musim Kemarau di Indonesia*. Menetapkan puncak musim kemarau (*peak dry season*) untuk wilayah Sumatra bagian tengah/selatan dan Kalimantan terjadi pada bulan **Agustus–September**, dengan anomali curah hujan rendah berlanjut hingga **Oktober** sebelum masuknya angin Monsun Barat Basah di November.
* **KLHK (SiPongi+ / Sistem Pemantauan Karhutla):** Rekapitulasi bulanan jumlah titik panas (*hotspot* Terra/Aqua/NPP) dan kejadian kebakaran hutan/lahan di provinsi prioritas (Kalbar, Kalteng, Kalsel, Riau, Jambi, Sumsel) mencapai frekuensi tertinggi pada bulan **Agustus, September, dan Oktober**.

### 2.4 Literatur Ilmiah Terindeks (Peer-Reviewed)
1. **Field, R. D., et al. (2016)**
   * *Judul:* "A seasonal fire early warning system for Indonesia."
   * *Jurnal:* *Nature Climate Change*, 6(3), 291–296. https://doi.org/10.1038/nclimate2905
   * *Temuan:* Puncak emisi kebakaran biomassa di Kalimantan dan Sumatra terkonsentrasi kuat pada bulan Agustus–Oktober, dipicu oleh interaksi antara musim kemarau dan fase Madden-Julian Oscillation (MJO) / El Niño-Southern Oscillation (ENSO).
2. **Hayasaka, H., Noguchi, I., Putra, E. I., Yulianti, N., & Vadrevu, K. (2014)**
   * *Judul:* "Peat-fire-related air pollution in Central Kalimantan, Indonesia."
   * *Jurnal:* *Environmental Hazards*, 13(2), 126–141. https://doi.org/10.1080/17477891.2014.888574
   * *Temuan:* Pemantauan polusi di Palangka Raya mengonfirmasi bahwa kebakaran lahan gambut masif dan lonjakan ekstrem $\text{PM}_{2.5}$ terjadi setiap tahun pada bulan Agustus, September, dan Oktober.
3. **Gaveau, D. L. A., et al. (2014)**
   * *Judul:* "Major atmospheric emissions from peat fires in Southeast Asia during non-drought years."
   * *Jurnal:* *Proceedings of the National Academy of Sciences (PNAS)*, 111(35), 12805–12810. https://doi.org/10.1073/pnas.1406530111
   * *Temuan:* Emisi kabut asap gambut di Sumatra bagian timur berulang secara musiman selama masa defisit curah hujan monsun tenggara (Juli–Oktober).

---

## 3. Metodologi Normalisasi dan Konversi Satuan Logger (ppm $\to \mu\text{g/m}^3$)

### 3.1 Identifikasi Stasiun Logger Non-Standar
Pada berkas master stasiun, terdapat 3 stasiun AQMS yang mencatat unit konsentrasi sebagai `ppm` pada kolom metadatanya:
1. `AQMS-BJB-01` (Banjarbaru, Kalimantan Selatan)
2. `AQMS-MDN-01` (Medan, Sumatra Utara)
3. `AQMS-PSW-01` (Pesawaran, Lampung)

Sesuai kontrak [unit_normalization.py](scripts/unit_normalization.py) dan verifikasi pipeline data:

### 3.2 Partikulat ($\text{PM}_{2.5}$ dan $\text{PM}_{10}$)
* **Konteks Logger:** Sensor massa partikulat (seperti sensor *beta attenuation monitor* / BAM atau sensor hamburan optik laser) mengukur densitas massa, bukan konsentrasi volumetrik gas. Nilai berlabel `ppm` pada sensor partikulat adalah representasi unit logger $\text{mg/m}^3$.
* **Formulasi Konversi:**
  $$\text{Konsentrasi } (\mu\text{g/m}^3) = \text{Nilai Logger } (\text{mg/m}^3) \times 1.000$$
* **Rujukan Manual Instrumen:**
  - Met One Instruments: *BAM-1020 Particulate Monitor Operation Manual* (Rev K). https://metone.com/
  - Thermo Fisher Scientific: *Model 5014i Beta Continuous Particulate Monitor Manual*.

### 3.3 Polutan Gas ($\text{SO}_2, \text{CO}, \text{O}_3, \text{NO}_2$)
* **Kondisi Rujukan Standar (Standard Reference Conditions):**
  - Tekanan: $1\ \text{atm}$ ($101.325\ \text{kPa}$)
  - Temperatur: $25^\circ\text{C}$ ($298,15\ \text{K}$)
  - Volume Molar Gas Ideal ($V_m$): $24,45\ \text{L/mol}$ ($0,02445\ \text{m}^3/\text{mol}$)
* **Rumus Dasar Hukum Gas Ideal:**
  $$\text{Konsentrasi } (\mu\text{g/m}^3) = \frac{\text{Konsentrasi } (\text{ppmv}) \times \text{Massa Molar } (M) \times 1.000}{V_m}$$
  $$\text{Konsentrasi } (\mu\text{g/m}^3) = \text{Konsentrasi } (\text{ppmv}) \times \frac{M \times 1.000}{24,45}$$
* **Faktor Konversi yang Diterapkan:**

| Polutan Gas | Massa Molar ($M$ dalam $\text{g/mol}$) | Perhitungan Faktor | Faktor Pengali ($\text{ppm} \to \mu\text{g/m}^3$) |
| :--- | :--- | :--- | :--- |
| **Sulfur Dioksida ($\text{SO}_2$)** | $64,066$ | $\frac{64,066 \times 1.000}{24,45}$ | $\approx 2.620,286$ |
| **Karbon Monoksida ($\text{CO}$)** | $28,010$ | $\frac{28,010 \times 1.000}{24,45}$ | $\approx 1.145,603$ |
| **Ozon ($\text{O}_3$)** | $48,000$ | $\frac{48,000 \times 1.000}{24,45}$ | $\approx 1.963,190$ |
| **Nitrogen Dioksida ($\text{NO}_2$)** | $46,006$ | $\frac{46,006 \times 1.000}{24,45}$ | $\approx 1.881,636$ |

* **Rujukan Standar Konversi Gas:**
  - Canadian Centre for Occupational Health and Safety (CCOHS): *Gas and Vapour Concentrations - Converting from ppm to $\text{mg/m}^3$ and $\mu\text{g/m}^3$*. https://www.ccohs.ca/oshanswers/chemicals/convert.html
  - Ecotech / Acoem: *Serinus 40 Oxides of Nitrogen Analyzer User Manual*.
  - Thermo Fisher Scientific: *42i NO-NO2-NOx Analyzer Technical Specification*.

---

## 4. Protokol Penyaringan dan Integritas Data (Shared AQMS Contract)

Sesuai kontrak [simulasi_penyaringan_tab2.ipynb](notebooks/simulasi_penyaringan_tab2.ipynb) dan [AGENTS.md](AGENTS.md):

1. **Penyaringan QC Record:**
   - Default: Hanya rekaman berlabel `VALID`.
   - Opsi `Sertakan data SUSPECT`: Mengikutsertakan rekaman `VALID` dan `SUSPECT`.
   - Penolakan Duplikasi: Jika terdapat `timestamp_start` ganda dalam satu stasiun, **seluruh rekaman duplikat ditolak**, bukan hanya rekaman kedua.
   - Nilai Negatif: Nilai konsentrasi $< 0$ ditolak; nilai $0$ riil dipertahankan.
2. **Kecukupan Rata-rata Harian 24 Jam:**
   - Wajib memiliki minimal **18 jam unik** yang memenuhi syarat dalam 1 hari kalender lokal. Menghitung 18 baris saja tidak sah jika jam tidak unik.
   - Hari yang tidak mencapai 18 jam valid bernilai `null` (tidak diimputasi dan tidak diganti nol).
3. **Kecukupan Ambang Bergerak 8 Jam ($\text{CO}$ dan $\text{O}_3$):**
   - Jendela bergerak 8 jam dimulai dari jam 00 hingga 16 (17 jendela per hari).
   - Setiap jendela wajib memiliki **8 jam lengkap berurutan**.
   - Hari kalender dianggap valid jika memiliki minimal **13 dari 17 jendela lengkap**.
4. **Kecukupan Evaluasi Tahunan:**
   - Ambang batas kelengkapan konvensi analitis adalah $\ge 75\%$ hari terukur dalam 1 tahun kalender penuh (365/366 hari).
   - Data tahun parsial (seperti 2026 yang hanya sampai 14 Oktober) ditandai eksplisit sebagai *Parsial / Belum Memenuhi Kepatuhan Penuh*.
5. **Algoritma Episode Pelampauan:**
   - Episode dihitung dari hari-hari berurutan yang melampaui baku mutu harian.
   - Jeda Penggabungan: Tepat 1 hari terukur yang berada di bawah baku mutu diperbolehkan menjembatani dua episode.
   - Hari Hilang (*Missing Data*): Hari yang hilang/tidak mencukupi **selalu memutus episode**, tidak pernah dijembatani atau diisi asumsi.

---
*Terakhir diperbarui: 13 November 2026 (WIB)*

