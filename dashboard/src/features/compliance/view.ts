import { CATEGORIES } from '../../data/types';
import type { FilterState, Station } from '../../data/types';
import { button, element, emptyState } from '../../shared/dom';
import { number, period } from '../../shared/format';
import { metric, panel } from '../../shared/panel';
import { categoryColors } from '../../shared/palette';
import { searchableSelect } from '../../components/search-select';
import { aqmsFilteringMethodology } from '../../components/aqms-filtering-methodology';
import { annualChart, barChart } from './charts';
import { annualAssessment, annualDisplayRows, calendarDaysInYear, defaultComparisonCodes, distributionRows, selectRows, splitRankings, stationComparisons } from './model';
import { REFERENCES, selectedPollutant } from '../../shared/pollutants';
import { estimateIku, ikuCategory } from './iku';
import type { AnnualView, CategoryView } from './model';
import type { ComplianceData, ComplianceRow, IkuRow, StationComparison } from './types';

const TYPE_COLORS = ['#087f8c', '#bf7b0a', '#8875ad', '#0284c7', '#059669', '#be5267', '#a36435'];
const YEARS = [{ year: 2024, color: '#0284c7' }, { year: 2025, color: '#bf7b0a' }, { year: 2026, color: '#087f8c' }] as const;

export function mountComplianceView(host: HTMLElement, data: ComplianceData, catalog: readonly Station[], initial: FilterState) {
  const controller = new AbortController();
  let state = initial;
  let selectedYear = '2025';
  let categoryView: CategoryView = 'priority';
  let annualView: AnnualView = 'top';
  let currentAnnualRows: readonly ComplianceRow[] = [];
  let currentRows: readonly ComplianceRow[] = [];
  let comparisonRows: readonly StationComparison[] = [];
  let comparisonCodes: (string | null)[] = [null, null, null, null];
  let comparisonScope: string | null = null;
  const setHeading = (root: HTMLElement, title: string, subtitle: string): void => {
    const h = root.querySelector('.panel-header h3'); const p = root.querySelector('.panel-header p');
    if (h) h.textContent = title; if (p) p.textContent = subtitle;
  };
  const root = element('div', 'compliance-feature');
  const summary = panel('Ringkasan Kepatuhan PM2.5', 'Acuan harian PP 22/2021 · 55 µg/m³', 'compliance-summary');
  const metrics = element('div', 'compliance-metrics');
  summary.body.append(metrics);
  const comparison = panel('Perbandingan Konsentrasi Antarstasiun', 'Rata-rata periode · µg/m³ · skala sama pada kedua grafik');
  const rankingGrid = element('div', 'compliance-pair');
  const highHost = element('section', 'compliance-subpanel');
  const lowHost = element('section', 'compliance-subpanel');
  highHost.append(element('h4', '', 'Konsentrasi Tertinggi'));
  lowHost.append(element('h4', '', 'Konsentrasi Terendah'));
  rankingGrid.append(highHost, lowHost);
  const typeLegend = element('details', 'compliance-type-legend');
  typeLegend.append(element('summary', '', 'Legenda tipe lokasi'));
  const typesHost = element('div', 'compliance-legend');
  typeLegend.append(typesHost);
  comparison.body.append(rankingGrid, typeLegend);
  const distribution = panel('Distribusi Kategori Harian PM2.5', 'Proporsi hari terukur per stasiun · kategori berdasarkan konsentrasi 24 jam pada acuan ISPU');
  const categoryLegend = element('div', 'compliance-legend');
  for (const category of CATEGORIES) {
    const item = element('span');
    const dot = element('i', 'swatch');
    dot.style.backgroundColor = categoryColors[category]; dot.setAttribute('aria-hidden', 'true');
    item.append(dot, document.createTextNode(category)); categoryLegend.append(item);
  }
  const distributionModes = element('div', 'segmented-control');
  distributionModes.setAttribute('role', 'group');
  distributionModes.setAttribute('aria-label', 'Tampilan distribusi kategori');
  const priority = button('Prioritas');
  const allStations = button('Semua stasiun');
  distributionModes.append(priority, allStations);
  const distributionScope = element('p', 'panel-footnote');
  distributionScope.id = 'compliance-distribution-scope';
  const distributionHost = element('div', 'compliance-category-chart');
  distributionHost.id = 'compliance-distribution-chart';
  priority.setAttribute('aria-controls', distributionHost.id);
  allStations.setAttribute('aria-controls', distributionHost.id);
  const distributionToolbar = element('div', 'compliance-distribution-toolbar');
  distributionToolbar.append(distributionModes, distributionScope);
  distribution.body.append(distributionToolbar, categoryLegend, distributionHost);
  const lower = element('div', 'compliance-pair compliance-analysis-pair');
  const years = panel('Perbandingan Pelampauan Antar-Tahun', 'Periode sebanding 1 Januari–14 Oktober · stasiun dan QC mengikuti filter');
  const comparisonControls = element('details', 'data-disclosure compliance-comparison-controls');
  comparisonControls.append(element('summary', '', 'Pilih stasiun pembanding'));
  const comparisonFields = element('div', 'compliance-comparison-fields');
  const comparisonHint = element('p', 'panel-footnote', 'Maksimal empat stasiun dalam cakupan filter. Pilihan ini hanya mengubah grafik perbandingan.');
  comparisonHint.id = 'comparison-selection-hint';
  const comparisonStatus = element('p', 'sr-only'); comparisonStatus.setAttribute('role', 'status');
  const comparisonSelects = Array.from({ length: 4 }, (_item, i) => searchableSelect(`comparison-station-${i + 1}`, `Pembanding ${i + 1}`, value => {
    comparisonCodes[i] = value === 'none' ? null : value;
    renderComparison();
    comparisonStatus.textContent = 'Grafik perbandingan diperbarui.';
  }));
  for (const select of comparisonSelects) {
    select.field.querySelector('input')?.setAttribute('aria-describedby', comparisonHint.id);
    comparisonFields.append(select.field);
  }
  comparisonControls.append(comparisonFields, comparisonHint, comparisonStatus);
  comparisonControls.addEventListener('toggle', () => { if (!comparisonControls.open) for (const select of comparisonSelects) select.close(); }, { signal: controller.signal });
  const yearsLegend = element('div', 'compliance-legend');
  yearsLegend.setAttribute('role', 'group'); yearsLegend.setAttribute('aria-label', 'Legenda tahun pembanding');
  for (const year of YEARS) {
    const item = element('span'); const dot = element('i', 'swatch'); dot.style.backgroundColor = year.color; dot.setAttribute('aria-hidden', 'true');
    item.append(dot, document.createTextNode(String(year.year))); yearsLegend.append(item);
  }
  const yearsHost = element('div', 'compliance-years-chart');
  const yearsEmpty = emptyState('Data pembanding tidak tersedia', 'Pilih stasiun yang memiliki data pada periode pembanding.');
  const yearsTableHost = element('div');
  const yearsNote = element('p', 'panel-footnote');
  years.body.append(comparisonControls, yearsLegend, yearsHost, yearsEmpty, yearsNote, yearsTableHost);
  const iku = panel('Estimasi IKU Stasiun', 'Estimasi periode · adaptasi rumus Permen LHK 27/2021');
  const ikuScope = element('p', 'panel-footnote'); ikuScope.id = 'compliance-iku-scope';
  const ikuHost = element('div', 'compliance-iku-chart');
  const ikuEmpty = emptyState('Estimasi IKU tidak tersedia', 'Tidak ada pasangan harian NO2 dan SO2 yang memenuhi syarat pada pilihan ini.');
  const ikuTableHost = element('div');
  iku.body.append(ikuScope, ikuHost, ikuEmpty, element('p', 'panel-footnote', 'Hingga lima estimasi terendah · skor lebih tinggi = kualitas lebih baik. NO2 + SO2; estimasi lokasi, bukan IKU daerah resmi.'), ikuTableHost);
  lower.append(years.root, iku.root);
  const annual = panel('Evaluasi Acuan Tahunan', 'Dot plot rata-rata harian terukur · garis acuan PP 22/2021: 15 dan WHO 2021: 5 µg/m³');
  const yearLabel = element('label', 'compliance-year');
  yearLabel.append(document.createTextNode('Tahun evaluasi'));
  const yearSelect = element('select');
  yearSelect.setAttribute('aria-label', 'Tahun evaluasi');
  for (const year of ['2024', '2025', '2026']) {
    const option = element('option', '', year === '2026' ? '2026 · sampai 14 Oktober' : year);
    option.value = year; yearSelect.append(option);
  }
  yearSelect.value = selectedYear;
  yearLabel.append(yearSelect);
  const annualModes = element('div', 'segmented-control');
  annualModes.setAttribute('role', 'group'); annualModes.setAttribute('aria-label', 'Tampilan evaluasi tahunan');
  const annualTop = button('Top 10');
  const annualAll = button('Seluruh stasiun');
  annualModes.append(annualTop, annualAll);
  const partialLabel = element('label', 'suspect-option');
  const includePartial = element('input'); includePartial.type = 'checkbox';
  partialLabel.append(includePartial, document.createTextNode('Sertakan data parsial'));
  const annualScope = element('p', 'panel-footnote'); annualScope.id = 'compliance-annual-scope';
  annualScope.setAttribute('aria-live', 'polite');
  const annualToolbar = element('div', 'compliance-distribution-toolbar');
  annualToolbar.append(annualModes, partialLabel, annualScope);
  const annualHost = element('div');
  const annualNote = element('p', 'panel-footnote');
  const annualTable = element('div');
  annual.body.append(yearLabel, annualToolbar, annualNote, annualHost, annualTable);
  const tableHost = element('div');
  const empty = emptyState('Tidak ada pengamatan', 'Ubah pilihan stasiun/tanggal/polutan atau lihat keterangan satuan pada metodologi.');
  empty.hidden = true;
  const methodology = element('details', 'data-disclosure compliance-methodology');
  methodology.append(element('summary', '', 'Metodologi & cakupan data'));
  methodology.append(aqmsFilteringMethodology());
  methodology.append(element('p', '', 'Sumber: AQMS → sensors.csv → sites.csv. Pada BJB-01, MDN-01, dan PSW-01, PM2.5/PM10 berlabel ppm diasumsikan mg/m³ lalu dikalikan 1.000; gas berlabel ppm diasumsikan ppmv lalu dikalikan massa molekul/24,45 × 1.000 ke µg/m³ pada 25°C dan 1 atm. Massa molekul (g/mol): SO2 64,066; CO 28,010; O3 48,000; NO2 46,006. Kondisi referensi ini asumsi analisis yang disetujui pengguna, belum dikonfirmasi panitia; bukan suhu cuaca per baris. Data hilang, negatif, nonfinite, duplikat timestamp, dan QC di luar pilihan dikeluarkan. Rata-rata per jam dihitung sebelum agregasi harian, dengan minimal 18 jam berbeda. Hari tanpa kelengkapan cukup tidak masuk penyebut. Tidak ada imputasi.'));
  methodology.append(element('p', '', 'Kategori memakai rata-rata harian polutan terpilih dan batas konsentrasi 24 jam Permen LHK 14/2020, bukan ISPU maksimum enam polutan. Peringkat memakai rata-rata hari terukur periode terpilih; warna menunjukkan tipe lokasi. Pelampauan PP 22/2021 memakai rata-rata 24 jam untuk PM2.5/PM10/SO2/NO2; CO/O3 memakai maksimum rata-rata delapan jam. Untuk CO/O3, jendela bergeser di dalam hari (00–08 hingga 16–24), masing-masing harus memiliki delapan jam lengkap, dan minimal 13 dari 17 jendela tersedia per hari. Ini aturan kelengkapan analisis, bukan jaminan kepatuhan hukum. Penyebut pelampauan dapat berbeda dari jumlah hari rata-rata 24 jam. Kolom Hari pembanding hanya ditampilkan jika setidaknya satu stasiun memiliki jumlah berbeda dari Hari terukur; jika semua sama, satu kolom sudah mewakili keduanya.'));
  methodology.append(element('p', '', 'Evaluasi tahunan memilih tahun secara terpisah dari tanggal global. Grafik dimulai dari sepuluh rata-rata konsentrasi tertinggi dan dapat diperluas ke seluruh stasiun yang memenuhi pilihan cakupan; tabel lengkap tidak berubah. Opsi Sertakan data parsial awalnya nonaktif: kalender belum selesai atau hari terukur <75% dari 365/366 hari dikecualikan sebelum pemeringkatan. Ini kriteria analisis, bukan ketentuan kepatuhan hukum. Saat disertakan, data parsial memakai titik netral. Tooltip menunjukkan hari terukur, jumlah hari kalender setahun dan persentase cakupan. Acuan tahunan PP/WHO mengikuti polutan; CO tidak memiliki acuan tahunan PP, sehingga grafik dan kontrolnya dinonaktifkan. WHO tahunan ditampilkan untuk PM2.5/PM10/NO2 saja. Perbandingan pelampauan antar-tahun memakai 1 Januari–14 Oktober, termasuk 29 Februari pada tahun kabisat. Heatmap masih menunggu keputusan penempatan.'));
  methodology.append(element('p', '', 'Estimasi IKU: IEU = (NO2/40 + SO2/20)/2; IKU = 100 − (50/0,9) × (IEU − 0,1), mengacu Permen LHK 27/2021 Lampiran II. Ambil pasangan harian NO2/SO2 pada tanggal dan QC terpilih, rata-ratakan per stasiun dan terapkan rumus pada lokasi tersebut; tidak ada penggabungan antarstasiun. Ini estimasi lokasi dari AQMS yang tersedia; tidak mewakili IKU administratif resmi atau keterwakilan empat tipe lokasi. Rentang tanggal dapat parsial atau lintas tahun, sehingga hasil selalu estimasi periode. Gas logger memakai asumsi konversi di atas; data hilang tidak dianggap nol. Skor rumus di luar 0–100 ditampilkan apa adanya dengan keterangan, tanpa dipaksa masuk kategori.'));
  methodology.append(element('p', '', 'Perbandingan stasiun memakai 1 Januari sampai 14 Oktober pada 2024/2025/2026, terpisah dari tanggal global. Pengguna memilih hingga empat stasiun melalui empat pemilih yang dapat dicari; tidak ada duplikasi dan setiap pilihan dapat dikosongkan. Awalnya SM2-01, KTG-01, PLB-01 dan BJB-01 jika termasuk cakupan filter. Wilayah, tipe lokasi dan stasiun global membatasi daftar; pilihan yang masih sesuai dipertahankan. Jika tidak ada yang tersisa setelah cakupan berubah, pilihan awal diambil dari stasiun dalam cakupan baru. Polutan dan QC memperbarui angka tanpa mengganti pilihan. Pemilih lokal hanya mengubah grafik ini; tabel tetap memuat semua stasiun dalam filter global. Pola tetap, berfluktuasi atau tahun tidak lengkap boleh dipilih; data hilang tetap kosong. Selisih dinyatakan dalam poin persentase, bukan uji signifikansi atau efek kebijakan.'));
  const referenceLinks = element('p');
  for (const [label, href] of [
    ['PP 22/2021', 'https://peraturan.bpk.go.id/Details/161852/pp-no-22-tahun-2021'],
    ['Permen LHK 14/2020', 'https://jdih.menlhk.go.id/new2/uploads/files/P_14_2020_ISPU_menlhk_07302020074834.pdf'],
    ['WHO 2021', 'https://www.who.int/publications/i/item/9789240034228'],
    ['Permen LHK 27/2021', 'https://peraturan.bpk.go.id/Details/235366/permen-lhk-no-27-tahun-2021'],
    ['Konversi gas CCOHS', 'https://www.ccohs.ca/oshanswers/chemicals/convert.html'],
  ]) {
    const link = element('a', '', label); link.href = href ?? ''; link.target = '_blank'; link.rel = 'noopener noreferrer';
    referenceLinks.append(link, document.createTextNode(' · '));
  }
  methodology.append(referenceLinks);
  root.append(summary.root, empty, comparison.root, distribution.root, lower, annual.root, tableHost, methodology);
  host.replaceChildren(root);
  const highChart = barChart(highHost, 'Stasiun dengan konsentrasi tertinggi', false, true);
  const lowChart = barChart(lowHost, 'Stasiun dengan konsentrasi terendah', false, true);
  const categoryChart = barChart(distributionHost, 'Persentase kategori harian polutan terpilih per stasiun', true);
  distributionHost.querySelector('canvas')?.setAttribute('aria-describedby', distributionScope.id);
  const yearChart = barChart(yearsHost, 'Perbandingan persentase hari melampaui acuan per stasiun; tiga batang untuk 2024, 2025 dan 2026', false, false, true);
  const ikuChart = barChart(ikuHost, 'Estimasi IKU periode per stasiun; NO2 dan SO2', false, true);
  ikuHost.querySelector('canvas')?.setAttribute('aria-describedby', ikuScope.id);
  const dots = annualChart(annualHost);
  annualHost.querySelector('canvas')?.setAttribute('aria-describedby', annualScope.id);
  const types = [...new Set(catalog.map(station => station.siteType))].sort();
  const color = (type: string): string => TYPE_COLORS[types.indexOf(type) % TYPE_COLORS.length] ?? '#087f8c';
  const table = (rows: readonly ComplianceRow[], annualMode = false): HTMLElement => {
    const details = element('details', 'data-disclosure');
    details.append(element('summary', '', annualMode ? 'Lihat data tahunan & kelengkapan' : 'Lihat data periode terpilih'));
    const wrap = element('div', 'table-scroll'); wrap.tabIndex = 0; wrap.setAttribute('role', 'region'); wrap.setAttribute('aria-label', 'Tabel kepatuhan; geser horizontal bila diperlukan');
    const tableElement = element('table');
    const head = element('thead'); const heading = element('tr');
    const reference = REFERENCES[selectedPollutant(state)];
    const showComparisonDays = !annualMode && rows.some(row => row.days !== row.comparisonDays);
    if (showComparisonDays) {
      tableElement.classList.add('compliance-period-table');
      const columns = element('colgroup');
      for (const width of [20, 14, 10, 6.5, 9, 7.5, 6.6, 6.6, 6.6, 6.6, 6.6]) {
        const column = element('col'); column.style.width = `${width}%`; columns.append(column);
      }
      tableElement.append(columns);
    }
    for (const label of ['Stasiun', 'Tipe lokasi', 'Rata-rata 24 jam (µg/m³)', 'Hari terukur', ...(annualMode ? ['Keterangan'] : [`Hari >${reference.daily} (${reference.hours} jam, %)`, ...(showComparisonDays ? ['Hari pembanding'] : []), ...CATEGORIES])]) heading.append(element('th', '', label));
    head.append(heading); const body = element('tbody');
    for (const row of rows) {
      const tr = element('tr');
      const name = element('th', '', `${row.station.code} · ${row.station.city}`); name.scope = 'row';
      tr.append(name, element('td', '', row.station.siteType), element('td', '', row.mean === null ? '—' : number(row.mean)), element('td', '', number(row.days)));
      if (annualMode) tr.append(element('td', '', annualStatus(row)));
      else {
        tr.append(element('td', '', row.comparisonDays ? number(row.exceed / row.comparisonDays * 100) : '—'));
        if (showComparisonDays) tr.append(element('td', '', number(row.comparisonDays)));
        for (const count of row.categories) tr.append(element('td', '', row.days ? number(count / row.days * 100) : '—'));
      }
      if (row.reason) tr.title = row.reason;
      body.append(tr);
    }
    tableElement.append(head, body); wrap.append(tableElement); details.append(wrap); return details;
  };
  function ikuTable(rows: readonly IkuRow[]): HTMLDetailsElement {
    const details = element('details', 'data-disclosure'); details.append(element('summary', '', 'Lihat seluruh estimasi & cakupan IKU'));
    const wrap = element('div', 'table-scroll'); wrap.tabIndex = 0; wrap.setAttribute('role', 'region'); wrap.setAttribute('aria-label', 'Tabel estimasi IKU; geser horizontal bila diperlukan');
    const table = element('table'); const head = element('thead'); const tr = element('tr');
    for (const name of ['Stasiun', 'Wilayah', 'Estimasi IKU', 'Kategori', 'NO2 (µg/m³)', 'SO2 (µg/m³)', 'Hari berpasangan']) { const th = element('th', '', name); th.scope = 'col'; tr.append(th); }
    head.append(tr); const body = element('tbody');
    for (const row of rows) {
      const line = element('tr'); const name = element('th', '', `${row.station.code} · ${row.station.city}`); name.scope = 'row'; line.append(name);
      for (const value of [row.station.region, row.score === null ? 'Tidak tersedia' : number(row.score), row.score === null ? '—' : ikuCategory(row.score), row.no2 === null ? '—' : number(row.no2), row.so2 === null ? '—' : number(row.so2), number(row.days)]) line.append(element('td', '', value));
      body.append(line);
    }
    table.append(head, body); wrap.append(table); details.append(wrap); return details;
  }
  function comparisonTable(rows: readonly StationComparison[]): HTMLDetailsElement {
    const details = element('details', 'data-disclosure'); details.append(element('summary', '', 'Lihat perbandingan seluruh stasiun'));
    const wrap = element('div', 'table-scroll'); wrap.tabIndex = 0; wrap.setAttribute('role', 'region'); wrap.setAttribute('aria-label', 'Tabel perbandingan antar-tahun; geser horizontal bila diperlukan');
    const table = element('table'); table.append(element('caption', 'sr-only', 'Persentase hari melampaui acuan per tahun dan perubahan dalam poin persentase (pp). Periode 1 Januari–14 Oktober.'));
    const head = element('thead'); const heading = element('tr');
    for (const label of ['Stasiun', '2024', '2025', '2026', 'Δ24–25 (pp)', 'Δ25–26 (pp)', 'Δ24–26 (pp)', 'Pola']) { const th = element('th', '', label); th.scope = 'col'; heading.append(th); }
    head.append(heading); const body = element('tbody');
    for (const row of rows) {
      const tr = element('tr'); const name = element('th', '', `${row.station.code} · ${row.station.city}`); name.scope = 'row'; tr.append(name);
      for (const year of row.years) {
        const td = element('td'); td.append(element('strong', '', year.rate === null ? 'Tidak tersedia' : `${number(year.rate)}%`)); tr.append(td);
      }
      for (const change of [row.change2425, row.change2526, row.change2426]) tr.append(element('td', '', change === null ? '—' : `${change > 0 ? '+' : ''}${number(change)}`));
      tr.append(element('td', '', row.pattern)); body.append(tr);
    }
    table.append(head, body); wrap.append(table); details.append(wrap); return details;
  }
  function annualStatus(row: ComplianceRow): string {
    if (row.mean === null) return row.reason || 'Tidak ada hari terukur';
    const assessment = annualAssessment(row, selectedYear, data.dates[data.dates.length - 1] ?? '', selectedPollutant(state));
    if (assessment === 'unavailable') return 'Acuan tahunan PP tidak tersedia';
    if (assessment === 'partial') return 'Data tahunan parsial';
    return assessment === 'above' ? 'Di atas acuan PP 22/2021' : 'Di bawah/sama dengan acuan PP 22/2021';
  }
  function renderDistribution(): void {
    const categoryRows = distributionRows(currentRows, categoryView);
    const count = currentRows.filter(row => row.mean !== null && row.days > 0).length;
    priority.setAttribute('aria-pressed', String(categoryView === 'priority'));
    allStations.setAttribute('aria-pressed', String(categoryView === 'all'));
    distributionScope.textContent = categoryView === 'priority'
      ? `${categoryRows.length} dari ${count} stasiun terukur · proporsi hari Tidak Sehat atau lebih buruk tertinggi.`
      : `Seluruh ${categoryRows.length} stasiun terukur · diurutkan menurut proporsi hari Tidak Sehat atau lebih buruk.`;
    categoryChart.update(categoryRows.map(row => row.station.code.replace('AQMS-', '')), CATEGORIES.map((category, i) => ({ label: `${category} (%)`, values: categoryRows.map(row => (row.categories[i] ?? 0) / row.days * 100), color: categoryColors[category] })), 100);
  }
  function renderAnnual(): void {
    const pollutant = selectedPollutant(state);
    const reference = REFERENCES[pollutant];
    const lastDate = data.dates[data.dates.length - 1] ?? '';
    const eligible = currentAnnualRows.filter(row => includePartial.checked || annualAssessment(row, selectedYear, lastDate, pollutant) !== 'partial');
    const selected = annualDisplayRows(eligible, annualView);
    const measured = currentAnnualRows.filter(row => row.mean !== null).length;
    const eligibleCount = eligible.filter(row => row.mean !== null).length;
    const expectedDays = calendarDaysInYear(selectedYear);
    annualTop.setAttribute('aria-pressed', String(annualView === 'top'));
    annualAll.setAttribute('aria-pressed', String(annualView === 'all'));
    annualTop.disabled = reference.annual === null;
    annualAll.disabled = reference.annual === null;
    includePartial.disabled = reference.annual === null;
    annualScope.textContent = reference.annual === null ? 'Acuan tahunan tidak tersedia.'
      : !eligibleCount && measured && !includePartial.checked ? 'Seluruh data terukur parsial. Aktifkan “Sertakan data parsial” untuk melihat grafik.'
      : `${selected.length} dari ${eligibleCount} stasiun terukur · ${annualView === 'top' ? 'konsentrasi tahunan tertinggi' : 'urut konsentrasi tertinggi ke terendah'}.${!includePartial.checked && measured > eligibleCount ? ` ${measured - eligibleCount} stasiun dengan data parsial dikecualikan.` : ''}`;
    dots.update(selected.flatMap(row => row.mean === null || reference.annual === null ? [] : [{ code: row.station.code, mean: row.mean, status: annualStatus(row), color: annualStatus(row) === 'Data tahunan parsial' ? '#89949a' : row.mean > reference.annual ? '#ef4444' : '#059669', coverage: `Cakupan: ${number(row.days)} / ${expectedDays} hari (${number(row.days / expectedDays * 100)}%)` }]), pollutant);
  }
  function renderComparison(): void {
    const rowByCode = new Map(comparisonRows.map(row => [row.station.code, row]));
    for (let i = 0; i < comparisonSelects.length; i++) {
      const options: [string, string][] = [['none', 'Tidak dipilih']];
      for (const row of [...comparisonRows].sort((a, b) => a.station.code.localeCompare(b.station.code))) {
        if (comparisonCodes.some((code, slot) => slot !== i && code === row.station.code)) continue;
        options.push([row.station.code, `${row.station.code} · ${row.station.city}`]);
      }
      comparisonSelects[i]?.setOptions(options, comparisonCodes[i] ?? 'none');
    }
    const selected = comparisonCodes.flatMap(code => { const row = code ? rowByCode.get(code) : undefined; return row ? [row] : []; });
    const hasData = selected.some(row => row.years.some(year => year.rate !== null));
    const yearMaximum = Math.min(100, Math.max(10, Math.ceil(Math.max(0, ...selected.flatMap(row => row.years.map(year => year.rate ?? 0))) / 10) * 10));
    yearChart.update(hasData ? selected.map(row => row.station.code.replace('AQMS-', '')) : [], YEARS.map(year => ({ label: `${year.year} (%)`, values: hasData ? selected.map(row => row.years.find(item => item.year === year.year)?.rate ?? null) : [], color: year.color })), yearMaximum);
    yearsEmpty.hidden = hasData;
    const heading = yearsEmpty.querySelector('h3'); const message = yearsEmpty.querySelector('p');
    if (heading) heading.textContent = selected.length ? 'Data pembanding tidak tersedia' : 'Pilih stasiun pembanding';
    if (message) message.textContent = selected.length ? 'Stasiun terpilih tidak memiliki hari terukur pada periode pembanding. Data kosong tidak dianggap nol.' : 'Buka pemilih untuk menambahkan hingga empat stasiun.';
  }
  function update(next: FilterState): void {
    state = next;
    const pollutant = selectedPollutant(state);
    const reference = REFERENCES[pollutant];
    setHeading(summary.root, `Ringkasan Kepatuhan ${pollutant}`, `Acuan PP 22/2021 · ${reference.daily} µg/m³ · ${reference.hours === 8 ? 'maksimum rata-rata 8 jam per hari' : 'rata-rata 24 jam'}`);
    setHeading(distribution.root, `Distribusi Kategori Harian ${pollutant}`, 'Proporsi hari terukur per stasiun · kategori konsentrasi 24 jam pada acuan ISPU');
    setHeading(annual.root, 'Evaluasi Acuan Tahunan', reference.annual === null ? `${pollutant}: PP 22/2021 tidak menetapkan acuan tahunan` : `${pollutant} · PP 22/2021: ${reference.annual}${reference.whoAnnual === null ? '' : ` · WHO 2021: ${reference.whoAnnual}`} µg/m³`);
    const rows = selectRows(data, catalog, state);
    currentRows = rows;
    const available = rows.filter(row => row.mean !== null);
    const days = rows.reduce((sum, row) => sum + row.days, 0);
    const exceed = rows.reduce((sum, row) => sum + row.exceed, 0);
    const comparisonDays = rows.reduce((sum, row) => sum + row.comparisonDays, 0);
    const highest = available[0];
    metrics.replaceChildren(
      metric('Stasiun Terukur', `${available.length}`, 'stasiun', `${rows.length - available.length} pilihan tanpa data tersedia`),
      metric('Hari Melebihi Acuan', comparisonDays ? number(exceed / comparisonDays * 100) : '—', '%', `>${reference.daily} µg/m³ · ${reference.hours} jam · ${number(comparisonDays)} hari-stasiun pembanding`),
      metric('Hari-Stasiun Terukur', number(days), '', `Rata-rata 24 jam · ${number(exceed)} hari-stasiun melampaui acuan ${reference.hours} jam`),
      metric('Konsentrasi Tertinggi', highest?.mean === null || highest?.mean === undefined ? '—' : number(highest.mean), 'µg/m³', highest?.station.code ?? 'Tidak ada data'),
    );
    empty.hidden = available.length > 0;
    const groups = splitRankings(rows);
    const maximum = Math.max(10, ...available.map(row => (row.mean ?? 0) * 1.1));
    for (const [chart, group] of [[highChart, groups.high], [lowChart, groups.low]] as const) chart.update(group.map(row => row.station.code.replace('AQMS-', '')), [{ label: `${pollutant} (µg/m³)`, values: group.map(row => row.mean), color: group.map(row => color(row.station.siteType)) }], maximum);
    lowHost.hidden = !groups.low.length;
    typesHost.replaceChildren(...[...new Set(available.map(row => row.station.siteType))].map(type => {
      const span = element('span'); const dot = element('i', 'swatch'); dot.style.backgroundColor = color(type); span.append(dot, document.createTextNode(type)); return span;
    }));
    renderDistribution();
    comparisonRows = stationComparisons(data, catalog, state);
    const scopeKey = comparisonRows.map(row => row.station.code).sort().join('|');
    if (comparisonScope !== scopeKey) {
      const availableCodes = new Set(comparisonRows.map(row => row.station.code));
      const retained = comparisonCodes.map(code => code !== null && availableCodes.has(code) ? code : null);
      const codes = retained.some(code => code !== null) ? retained : defaultComparisonCodes(comparisonRows);
      comparisonCodes = Array.from({ length: 4 }, (_item, i) => codes[i] ?? null);
      if (comparisonScope !== null) comparisonStatus.textContent = 'Pilihan pembanding disesuaikan dengan cakupan filter.';
      comparisonScope = scopeKey;
    }
    renderComparison();
    yearsNote.textContent = `${pollutant} >${reference.daily} µg/m³ (${reference.hours} jam) · lebih rendah lebih baik. Periode pembanding tetap; cakupan hari dapat berbeda.`;
    const nextComparisonTable = comparisonTable(comparisonRows);
    nextComparisonTable.open = yearsTableHost.querySelector('details')?.open ?? false;
    yearsTableHost.replaceChildren(nextComparisonTable);
    const ikuRows = estimateIku(data, catalog, state);
    const measuredIku = ikuRows.filter(row => row.score !== null);
    const priorities = measuredIku.slice(0, 5);
    ikuChart.update(priorities.map(row => row.station.code.replace('AQMS-', '')), [{ label: 'Estimasi IKU', values: priorities.map(row => row.score), color: '#087f8c' }], Math.max(100, ...priorities.map(row => row.score ?? 0)));
    ikuEmpty.hidden = measuredIku.length > 0;
    ikuScope.textContent = `${period(state.startDate ?? data.dates[0] ?? '', state.endDate ?? data.dates[data.dates.length - 1] ?? '')} · ${measuredIku.length}/${ikuRows.length} stasiun berpasangan · ${state.includeSuspect ? 'VALID + SUSPECT' : 'VALID'}`;
    const nextIkuTable = ikuTable(ikuRows);
    nextIkuTable.open = ikuTableHost.querySelector('details')?.open ?? false;
    ikuTableHost.replaceChildren(nextIkuTable);
    const annualRows = selectRows(data, catalog, { ...state, startDate: `${selectedYear}-01-01`, endDate: `${selectedYear}-12-31` });
    currentAnnualRows = annualRows;
    renderAnnual();
    annualNote.textContent = reference.annual === null ? `${pollutant}: tidak ada acuan tahunan PP 22/2021; grafik evaluasi tidak tersedia. Rata-rata dan kelengkapan tetap tersedia pada tabel.` : `${selectedYear}: tahun dipilih terpisah dari tanggal global; polutan, stasiun dan QC mengikuti filter. Titik netral = tahun/kelengkapan parsial. Bukan keputusan kepatuhan hukum.`;
    annualTable.replaceChildren(table(annualRows, true)); tableHost.replaceChildren(table(rows));
  }
  yearSelect.addEventListener('change', () => { selectedYear = yearSelect.value; update(state); }, { signal: controller.signal });
  annualTop.addEventListener('click', () => { annualView = 'top'; renderAnnual(); }, { signal: controller.signal });
  annualAll.addEventListener('click', () => { annualView = 'all'; renderAnnual(); }, { signal: controller.signal });
  includePartial.addEventListener('change', renderAnnual, { signal: controller.signal });
  priority.addEventListener('click', () => { categoryView = 'priority'; renderDistribution(); }, { signal: controller.signal });
  allStations.addEventListener('click', () => { categoryView = 'all'; renderDistribution(); }, { signal: controller.signal });
  update(initial);
  return { update, destroy: () => { controller.abort(); for (const select of comparisonSelects) select.destroy(); for (const chart of [highChart, lowChart, categoryChart, yearChart, ikuChart, dots]) chart.destroy(); root.remove(); } };
}
