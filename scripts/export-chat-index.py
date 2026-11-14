"""Build api/rag-index.json: compact factual chunks from the dashboard exports for grounded chat."""
import json
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / 'dashboard' / 'data'
DASH = ROOT / 'dashboard'

DAILY_REFS = {'PM2.5': 55, 'PM10': 75, 'SO2': 75, 'NO2': 65, 'CO': 4000, 'O3': 100}
ANNUAL_REFS = {'PM2.5': 15, 'PM10': 40, 'SO2': 45, 'NO2': 50, 'O3': 35}
EIGHT_HOUR = {'CO', 'O3'}
POLLUTANTS = ['PM2.5', 'PM10', 'SO2', 'NO2', 'CO', 'O3']


def load(path):
    return json.loads(path.read_text())


def mean(values):
    return sum(values) / len(values) if values else None


def fmt(value, digits=1):
    return 'tidak tersedia' if value is None else f'{value:.{digits}f}'.replace('.', ',')


def build():
    tab1 = load(DASH / 'tab1_ikhtisar.json')
    catalog = load(DATA / 'station_catalog.json')
    compliance = load(DATA / 'compliance_daily.json')
    health = load(DATA / 'health_outcomes.json')
    policy = load(DATA / 'policy_context.json')

    meta = tab1['meta']
    period = f"{meta['date_range_start']} s.d. {meta['date_range_end']}"
    kpi = tab1['kpi']
    dates = health['dates']
    chunks = [{'id': 'core', 'topic': 'Cakupan dan aturan analisis',
               'text': (
                   f"Dashboard PRANA — DA2026_NasiBakarCumiHitamPakKris. Periode data {period} "
                   f"({len(dates)} hari, {meta['total_stations']} stasiun pemantau, 27 faskes anonim). "
                   "Satuan konsentrasi µg/m³. Aturan QC: hari dihitung minimal 18 jam berbeda per polutan; "
                   "mode VALID utama, VALID+SUSPECT adalah sensitivitas. Tiga stasiun (AQMS-BJB-01, AQMS-MDN-01, "
                   "AQMS-PSW-01) memakai asumsi normalisasi logger yang disetujui pengguna (partikulat ppm→skala mg/m³ ×1.000; "
                   "gas ppmv→µg/m³ pada 25 °C dan 1 atm) — asumsi analitis, bukan konfirmasi panitia. "
                   "Acuan harian PP 22/2021 (µg/m³): PM2.5 55, PM10 75, SO2 75, NO2 65 (24 jam); CO 4000, O3 100 (maksimum 8 jam). "
                   "Acuan tahunan: PM2.5 15, PM10 40, SO2 45, NO2 50, O3 35; CO tidak punya acuan tahunan. "
                   "Semua hasil bersifat deskriptif/eksploratif: bukan bukti kausal, bukan nasihat medis, bukan keputusan hukum. "
                   "Konteks asisten ini TIDAK memuat data per jam, korelasi cuaca, atau deret waktu harian per stasiun — "
                   "pertanyaan di luar cakupan konteks harus dijawab 'data tidak tersedia', jangan ditebak."
               )},
              {'id': 'kpi', 'topic': 'Indikator nasional Ikhtisar',
               'text': (
                   f"Ikhtisar nasional (mode VALID, rata-rata berbobot sama antar stasiun terukur): "
                   f"rata-rata PM2.5 {fmt(kpi['avg_pm25_national'], 2)} µg/m³; "
                   f"{fmt(kpi['pct_days_exceed_24h'])}% hari rata-rata nasional di atas acuan harian PM2.5 55 µg/m³; "
                   f"stasiun paling kritis {kpi['station_most_critical']['station_code']} ({kpi['station_most_critical']['kota']}) "
                   f"dengan rata-rata {fmt(kpi['station_most_critical']['avg_pm25'], 2)} µg/m³ dan "
                   f"{fmt(kpi['station_most_critical']['pct_exceed'])}% hari di atas acuan. "
                   f"Indeks beban hospital {fmt(kpi['hospital_burden_index'], 2)} = rerata harian admisi pernapasan balita+lansia "
                   f"({fmt(kpi['hospital_burden_detail']['avg_daily_resp_admissions'])} admisi/hari) ÷ "
                   f"{kpi['hospital_burden_detail']['total_bed_capacity']} tempat tidur ×100 — bukan keterisian tempat tidur. "
                   f"Cakupan terukur 26/27 stasiun (AQMS-JMB-02 tanpa hari memenuhi syarat)."
               )}]

    station_lines = []
    for row in sorted(tab1['map_stations'], key=lambda item: item['rank']):
        station_lines.append(
            f"{row['station_code']} — {row['kota']} ({row['site_type']}): rata-rata PM2.5 {fmt(row['avg_pm25'], 2)} µg/m³, "
            f"{fmt(row['pct_exceed_24h'])}% hari > acuan harian, kategori terbanyak {row['dominant_ispu_cat']}, "
            f"{fmt(row['pct_valid'])}% hari valid, peringkat {row['rank']}.")
    chunks.append({'id': 'stations', 'topic': 'Daftar dan nilai per stasiun', 'text': 'Katalog stasiun: ' + ' '.join(station_lines)})

    comp_lines = []
    for name in POLLUTANTS:
        values, exceed, days = [], 0, 0
        for station in compliance['stations'].values():
            series = station['pollutants'][name]
            pool = series['max8']['v'] if name in EIGHT_HOUR and series['max8'] else series['v']
            for value in series['v']:
                if value is not None:
                    values.append(value)
            for value in pool:
                if value is not None:
                    days += 1
                    if value > DAILY_REFS[name]:
                        exceed += 1
        comp_lines.append(
            f"{name}: rerata konsentrasi stasiun-hari {fmt(mean(values), 2)} µg/m³; "
            f"{exceed / days * 100 if days else 0:.1f}".replace('.', ',') +
            f"% hari di atas acuan {'maksimum 8 jam ' if name in EIGHT_HOUR else ''}{DAILY_REFS[name]} µg/m³ "
            f"({days} stasiun-hari terukur).")
    chunks.append({'id': 'compliance', 'topic': 'Ringkasan kepatuhan enam polutan', 'text':
                   'Kepatuhan periode penuh, semua stasiun, mode VALID, aturan 18 jam per hari: ' + ' '.join(comp_lines) +
                   ' Persentase = gabungan stasiun-hari terukur, bukan rata-rata persentase stasiun.'})

    outcome_fields = ['resp', 'resp_admissions_under5', 'resp_admissions_over60',
                      'asthma_emergency_cases', 'copd_admissions', 'cvd', 'death']
    outcome_labels = {'resp': 'admisi pernapasan umum', 'resp_admissions_under5': 'admisi pernapasan balita <5',
                      'resp_admissions_over60': 'admisi pernapasan lansia >60', 'asthma_emergency_cases': 'kasus darurat asma',
                      'copd_admissions': 'admisi PPOK', 'cvd': 'admisi kardiovaskular', 'death': 'kematian'}
    totals = {key: [] for key in outcome_fields}
    for station in health['stations'].values():
        for key in outcome_fields:
            totals[key].extend(value for value in station['outcomes'][key] if value is not None)
    beds = sum(station['beds'] for station in health['stations'].values())
    health_summary = ' '.join(
        f"rata-rata {outcome_labels[key]} {fmt(mean(totals[key]), 2)} kasus/faskes/hari;" for key in outcome_fields)
    station_list = list(health['stations'].values())
    complete_daily = []
    for i in range(len(dates)):
        values = [station['outcomes']['resp'][i] for station in station_list]
        if values and all(value is not None for value in values):
            complete_daily.append(sum(values))
    burden = (sum(complete_daily) / len(complete_daily) / beds * 100) if complete_daily and beds else None
    chunks.append({'id': 'health', 'topic': 'Ringkasan kesehatan faskes', 'text':
                   f"Kesehatan {len(health['stations'])} faskes anonim, {len(dates)} hari, total {int(beds)} tempat tidur: "
                   f"{health_summary} beban admisi pernapasan {fmt(burden, 2)} per 100 tempat tidur per hari (bukan keterisian). "
                   "Rata-rata per faskes-hari dengan data tersedia; kolom kelompok usia dihitung terpisah dari total."})

    health_lines = []
    for code, station in sorted(health['stations'].items()):
        outcomes = station['outcomes']
        resp = mean([value for value in outcomes['resp'] if value is not None])
        young = mean([value for value in outcomes['resp_admissions_under5'] if value is not None])
        old = mean([value for value in outcomes['resp_admissions_over60'] if value is not None])
        city = next((item['city'] for item in policy['stations'] if item['code'] == code), '')
        health_lines.append(
            f"{code} ({city}, {station['hospital']}, {int(station['beds'])} tempat tidur): pernapasan umum {fmt(resp, 1)}, "
            f"balita {fmt(young, 1)}, lansia {fmt(old, 1)} admisi/hari.")
    chunks.append({'id': 'health-stations', 'topic': 'Admisi dan kapasitas per faskes', 'text':
                   'Rincian per stasiun-faskes: ' + ' '.join(health_lines)})

    statuses = {}
    for station in policy['stations']:
        statuses[station['status']] = statuses.get(station['status'], 0) + 1
    nearest = sorted(policy['stations'], key=lambda item: item['nearest']['km'], reverse=True)[:5]
    nearest_text = ', '.join(f"{item['code']} {fmt(item['nearest']['km'])} km ke {item['nearest']['code']}" for item in nearest)
    chunks.append({'id': 'policy', 'topic': 'Status jaringan dan bukti kebijakan', 'text':
                   f"Jaringan {len(policy['stations'])} stasiun: status operasi {statuses}. "
                   f"Jarak antarstasiun terjauh: {nearest_text}. "
                   "Tindakan pada tab kebijakan adalah usulan peninjauan (instrumen, kesinambungan pemantauan, layanan), "
                   "bukan protokol resmi; lingkaran radius pada peta hanyalah asumsi ilustrasi, bukan jangkauan alat. "
                   "Skor ekspansi memakai baseline PM2.5 master, intensitas lalu lintas, dan jarak stasiun terdekat terhadap "
                   "seluruh katalog; tidak ada koordinat alat baru yang dibuat."})


    chunks.extend([
        {'id': 'viz-overview-compliance', 'topic': 'Fungsi visualisasi Ikhtisar dan Kepatuhan (Tab 1-2)',
         'text': (
             'Tab Ikhtisar Nasional: empat kartu indikator (rata-rata PM2.5, persentase hari di atas acuan harian, '
             'stasiun paling kritis, indeks beban hospital per 100 tempat tidur), donat kategori ISPU dominan per stasiun, '
             'peta stasiun dengan mode Acuan Harian (ISPU 24-jam) dan Acuan Tahunan (PP 22/2021) termasuk lingkaran radius konsentrasi, '
             'dan tabel data stasiun. Tab Kepatuhan Regulasi: ringkasan enam polutan, ranking konsentrasi tertinggi/terendah, '
             'distribusi persentase kategori harian per stasiun, perbandingan pelampauan antar-tahun 2024/2025/2026 (periode 1-14 Oktober), '
             'estimasi IKU stasiun dari NO2+SO2, dan evaluasi acuan tahunan dengan tabel kelengkapan. '
             'Semuanya mengikuti filter global wilayah, stasiun, tipe lokasi, tanggal, polutan, dan QC.'
         )},
        {'id': 'viz-temporal-drivers', 'topic': 'Fungsi visualisasi Pola Waktu dan Faktor Pemicu (Tab 3-4)',
         'text': (
             'Tab Pola Waktu: profil polusi per jam (median dan rentang P25-P75 WIB), heatmap hari x jam, '
             'tren harian per stasiun (syarat minimal 18 jam berbeda per hari), dan durasi episode pelampauan per stasiun. '
             'Tab Faktor Pemicu: mawar polusi arah angin untuk sampel stasiun (skala dapat disamakan), matriks korelasi Spearman polutan x cuaca, '
             'median konsentrasi menurut kecepatan angin, sebaran lalu lintas kendaraan vs konsentrasi dengan garis regresi (dapat difilter tanpa musim karhutla), '
             'perbandingan cuaca jam ekstrem vs jam normal, probabilitas jam ekstrem per jam hari, dan peringkat faktor penjelas (eta kuadrat dan R kuadrat). '
             'Semuanya mengikuti filter global.'
         )},
        {'id': 'viz-health-policy', 'topic': 'Fungsi visualisasi Dampak Kesehatan dan Rekomendasi (Tab 5-6)',
         'text': (
             'Tab Dampak Kesehatan: kartu admisi (indikator terpilih, balita, lansia, beban per 100 tempat tidur), '
             'deret paparan dan kasus harian dengan dua skala, korelasi lag 0-7 hari dengan penanda puncak, '
             'kasus menurut lima kuintil paparan (perubahan persen terhadap rerata tiap faskes), '
             'perubahan admisi balita dan lansia P1-P5 terhadap rerata periode pilihan, kasus di sekitar episode P90 (hari -3 s.d. +7, persen vs baseline), '
             'dan tekanan admisi pernapasan+CVD per 100 tempat tidur. '
             'Tab Rekomendasi Kebijakan: matriks respons kesehatan PM2.5 (kelompok paparan relatif fixed 2024), asumsi kapasitas manual (rerata/P90 admisi dan skenario kenaikan), '
             'prioritas ekspansi AQMS (skor 0-100 dari baseline PM2.5, lalu lintas, dan jarak antarstasiun dengan bobot pengguna), '
             'peta jaringan plus tabel bukti stasiun dengan radius ilustrasi, dan daftar Prioritas Tindakan. '
             'Semua hasil bersifat deskriptif.'
         )},
    ])


    chunks.extend([
        {'id': 'howto-capacity', 'topic': 'Cara menggunakan Asumsi Kapasitas Manual (panduan langkah)',
         'text': (
             'Panduan penggunaan panel "Asumsi Kapasitas Manual" di Tab Rekomendasi Kebijakan. '
             'Langkah: (1) Atur filter global dengan tombol Edit filter — pilihan tanggal dan faskes/wilayah/stasiun menentukan faskes dan hari yang dipakai; '
             'polutan dan QC TIDAK mengubah dasar admisi karena panel ini selalu memakai admisi pernapasan umum. '
             '(2) Pilih Dasar historis: tombol Rata-rata = rerata total harian (jumlah admisi pernapasan umum seluruh faskes pilihan pada tanggal dengan data lengkap semua faskes), '
             'atau tombol P90 = persentil 90 total harian tersebut (interpolasi linear posisi (n-1) x p). '
             '(3) Isi Kenaikan admisi (%) rentang 0-200, default 0. (4) Isi Tambahan tempat tidur bilangan bulat 0-100.000, default 0. '
             '(5) Kartu hasil langsung terhitung: Admisi historis (dasar), Admisi skenario = dasar x (1 + kenaikan/100) admisi/hari, '
             'dan Beban relatif skenario = admisi skenario / (kapasitas tercatat + tambahan tempat tidur) x 100 dalam satuan admisi per 100 tempat tidur per hari; '
             'persamaan lengkap ditampilkan di bawah kartu, contoh: dasar x (1 + 20/100) = skenario; beban = skenario / kapasitas x 100. '
             '(6) Dua grafik perbandingan batang membandingkan historis vs skenario untuk admisi/hari dan beban/100 tempat tidur/hari. '
             '(7) Tombol Reset skenario mengembalikan Rata-rata, kenaikan 0, tambahan 0; dengan kedua asumsi nol hasil sama persis dengan angka historis. '
             '(8) Input di luar rentang menampilkan peringatan dan hasil menjadi tidak tersedia (bukan mempertahankan nilai lama). '
             'Basis harian hanya memakai tanggal ketika SEMUA faskes pilihan punya data admisi lengkap; kapasitas = jumlah tempat tidur tercatat faskes pilihan; '
             'panel menyebut jumlah faskes dan hari yang dipakai. Ini asumsi perencanaan deskriptif — bukan okupansi tempat tidur, prediksi polusi, atau keputusan resmi.'
         )},
        {'id': 'howto-filters', 'topic': 'Cara menggunakan filter global dan efeknya per tab',
         'text': (
             'Panduan filter global: filter awalnya terlipat; klik Edit filter pada baris ringkasan di bawah header. '
             'Kontrol: Wilayah (dropdown), Tipe lokasi, Stasiun (pencarian), Tanggal mulai dan akhir, enam tombol polutan PM2.5, PM10, SO2, NO2, CO, O3, '
             'Nilai filter yang valid dari data — Wilayah: ' + ', '.join(sorted({c['region'] for c in catalog})) + '. '
             'Tipe lokasi: ' + ', '.join(sorted({c['siteType'] for c in catalog})) + '. '
             'Stasiun: kode AQMS-XXX-00 pada daftar stasiun; Polutan: PM2.5, PM10, SO2, NO2, CO, O3. '
             'dan checkbox SUSPECT untuk mode VALID + SUSPECT (default hanya VALID). Pilihan tersimpan saat berpindah tab; ringkasan selalu terlihat; '
             'menutup panel tidak menghapus pilihan; tombol reset mengembalikan seluruh pilihan awal. '
             'Efek per tab: Ikhtisar dan Kepatuhan memakai seluruh kontrol (ringkasan, distribusi, peta, tabel, peryear). '
             'Pola Waktu dan Faktor Pemicu memakai seluruh kontrol dan dihitung ulang per jam sesuai stasiun/QC terpilih. '
             'Dampak Kesehatan: tanggal dan faskes menentukan faskes/hari; polutan dan QC mengubah pengepasan paparan; pemilih Indikator kesehatan mengubah deret harian, korelasi lag, kuintil paparan, dan episode (panel kelompok usia dan tekanan kapasitas tetap memakai admisi pernapasan). '
             'Rekomendasi Kebijakan: tanggal dan faskes membatasi bukti, matriks respons, dan asumsi kapasitas manual; polutan dan QC mengubah cakupan paparan.'
         )},
        {'id': 'howto-controls-tab235', 'topic': 'Cara menggunakan kontrol Tab Kepatuhan, Pola Waktu, dan Dampak Kesehatan',
         'text': (
             'Tab Kepatuhan Regulasi: pilih Tahun evaluasi (default 2025) untuk dot plot evaluasi acuan tahunan; centang Sertakan data parsial bila ingin memasukkan tahun berjalan/kelengkapan di bawah 75% (default tidak dicentang); '
             'panel Perbandingan Pelampauan Antar-Tahun selalu memakai periode tetap 1 Januari-14 Oktober tahun 2024/2025/2026 dan mengikuti stasiun/QC terpilih; '
             'distribusi kategori punya toggle Prioritas (maks 10 stasiun terburuk) vs Semua stasiun; pemilih Pilih stasiun (4 slot) menentukan stasiun pada perbandingan bertahun. '
             'Tab Pola Waktu: toggle Profil per jam vs Bandingkan memisahkan musim Agu-Okt dan Nov-Jul; heatmap hari x jam menampilkan nilai saat kursor/disentuh; '
             'tampilan episode: Per stasiun vs Semua episode. '
             'Tab Dampak Kesehatan: pemilih Indikator kesehatan (7 indikator) mengubah KPI pertama, deret kasus harian, korelasi lag 0-7, kuintil paparan, dan studi episode; '
             'semua grafik mengikuti filter global; tooltip grafik memuat satuan dan jumlah faskes/pasangan.'
         )},
        {'id': 'howto-controls-tab46', 'topic': 'Cara menggunakan kontrol Tab Faktor Pemicu dan Rekomendasi Kebijakan',
         'text': (
             'Tab Faktor Pemicu: pada Ringkasan, toggle Ambang Global (P90) vs Ambang per Stasiun (P90) mengubah definisi jam ekstrem pada seluruh KPI, tabel, dan grafik probabilitas; '
             'mawar polusi memakai 3 dropdown stasiun (default 3 stasiun dengan rerata tertinggi polutan terpilih) dan tombol Skala Sama untuk menyamakan skala radial; '
             'grafik Angin & Konsentrasi memakai toggle Ternormalisasi (Rasio) vs Konsentrasi Absolut per tipe lokasi (bin di bawah 5 jam disembunyikan); '
             'grafik Lalu Lintas punya pemilih polutan NO2/CO/PM2.5 dan toggle Tanpa Musim Karhutla (Nov-Jul); '
             'panel ekstrem punya pilihan musim Musim Karhutla (Agu-Okt), Luar Karhutla, atau Semua Periode; peringkat faktor memakai eta kuadrat/R kuadrat dengan Spearman di detail. '
             'Tab Rekomendasi Kebijakan: panel Prioritas Studi Ekspansi AQMS punya tiga slider Bobot (Baseline PM2.5, Lalu lintas, Jarak antarstasiun) 0-100; '
             'skor = rata-rata terberat dari nilai ternormalisasi min-maks katalog; total bobot nol membuat skor tidak tersedia; Top 10 stasiun terpilih ditampilkan. '
             'Panel Lokasi dan Bukti: slider Radius ilustrasi pemantauan (10-300 km) menggambar lingkaran (asumsi geografis, bukan jangkauan alat), '
             'tombol urut Cakupan terendah / Jarak terbesar mengubah tabel, dan tombol Lihat di peta membuka popup stasiun. '
             'Asumsi Kapasitas Manual dan Matriks Respons Kesehatan juga mengikuti filter global.'
         )},
    ])


    def yearly_air_chunks():
        dates = compliance['dates']
        kota = {row['station_code']: row['kota'] for row in tab1['map_stations']}
        parts = []
        for year in ('2024', '2025', '2026'):
            idx = [i for i, day in enumerate(dates) if day[:4] == year and '01-01' <= day[5:] <= '10-14']
            if not idx:
                continue
            means, pooled_exceed, pooled_days = {}, 0, 0
            for code, station in compliance['stations'].items():
                series = station['pollutants']['PM2.5']['v']
                values = [series[i] for i in idx if series[i] is not None]
                if not values:
                    continue
                means[code] = sum(values) / len(values)
                pooled_days += len(values)
                pooled_exceed += sum(1 for value in values if value > 55)
            if not means:
                continue
            national = sum(means.values()) / len(means)
            critical = max(means, key=means.get)
            lowest = min(means, key=means.get)
            exceed_pct = pooled_exceed / pooled_days * 100 if pooled_days else 0
            parts.append(
                f'{year} (1 Jan-14 Okt): rata-rata PM2.5 {fmt(national, 2)} mikrogram/m3 dari {len(means)} stasiun terukur; '
                f'{fmt(exceed_pct)}% stasiun-hari di atas acuan harian 55; paling kritis {critical} ({kota.get(critical, "")}) '
                f'{fmt(means[critical], 2)}; paling rendah {lowest} ({kota.get(lowest, "")}) {fmt(means[lowest], 2)} mikrogram/m3.')
        return [{'id': 'yearly-air', 'topic': 'Insight rekap tahunan 2024 2025 2026 udara pelampauan',
                 'text': ('Rekap per tahun memakai jendela perbandingan resmi 1 Januari-14 Okt, sama seperti panel '
                          'Perbandingan Pelampauan Antar-Tahun di Tab Kepatuhan Regulasi. ' + ' '.join(parts) +
                          ' Tahun 2026 berakhir 14 Oktober. Angka Ikhtisar nasional (rata-rata 43,25 mikrogram/m3, 17,7% hari '
                          'di atas acuan) memakai seluruh 1.018 hari periode penuh, bukan per tahun. Persentase tahunan adalah '
                          'gabungan stasiun-hari terukur.')}]

    def yearly_health_chunks():
        hdates = health['dates']
        beds_total = sum(station['beds'] for station in health['stations'].values())
        parts = []
        for year in ('2024', '2025', '2026'):
            idx = [i for i, day in enumerate(hdates) if day[:4] == year]
            if not idx:
                continue
            values_by = {}
            for key in ('resp', 'resp_admissions_under5', 'resp_admissions_over60'):
                values = [station['outcomes'][key][i] for station in health['stations'].values() for i in idx
                          if station['outcomes'][key][i] is not None]
                values_by[key] = sum(values) / len(values) if values else None
            if values_by['resp'] is None:
                continue
            daily_totals = []
            for i in idx:
                values = [station['outcomes']['resp'][i] for station in health['stations'].values()]
                if values and all(value is not None for value in values):
                    daily_totals.append(sum(values))
            burden = (sum(daily_totals) / len(daily_totals) / beds_total * 100) if daily_totals and beds_total else 0
            parts.append(
                f'{year}: admisi pernapasan umum {fmt(values_by["resp"], 2)}, balita {fmt(values_by["resp_admissions_under5"], 2)}, '
                f'lansia {fmt(values_by["resp_admissions_over60"], 2)} kasus/faskes/hari; beban {fmt(burden, 2)} per 100 tempat tidur/hari.')
        return [{'id': 'yearly-health', 'topic': 'Insight rekap tahunan 2024 2025 2026 kesehatan admisi',
                 'text': ('Rekap kesehatan per tahun kalender penuh dalam rentang data (2026 hanya s.d. 14 Oktober), rata-rata '
                          'faskes-hari atas seluruh 27 faskes: ' + ' '.join(parts) +
                          ' Rerata deskriptif faskes-hari, bukan per kapita dan bukan angka rumah sakit tertentu.')}]

    chunks.extend(yearly_air_chunks())
    chunks.extend(yearly_health_chunks())

    index = {'version': 1, 'generated': datetime.now(timezone.utc).isoformat(timespec='seconds'), 'chunks': chunks}
    out = ROOT / 'api' / 'rag-index.json'
    out.parent.mkdir(exist_ok=True)
    content = json.dumps(index, ensure_ascii=False, separators=(',', ':')) + '\n'
    out.write_text(content)
    print(f'rag-index.json: {len(content):,} bytes; {len(chunks)} chunks')


if __name__ == '__main__':
    build()