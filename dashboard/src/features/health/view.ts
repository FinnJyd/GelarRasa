import type { FilterState, Station } from '../../data/types';
import { searchableSelect } from '../../components/search-select';
import { element } from '../../shared/dom';
import { date, number, period } from '../../shared/format';
import { metric, panel } from '../../shared/panel';
import { healthPlot } from './charts';
import { compareAgeGroups } from './age-comparison';
import { ageComparisonChart } from './age-comparison-chart';
import { mean, summarizeHealth } from './model';
import { OUTCOMES } from './types';
import type { HealthData, Outcome } from './types';

const compactDate = (value: string): string => date(value);
const display = (value: number | null): string => value === null ? '—' : number(value);

export function mountHealthView(host: HTMLElement, data: HealthData, catalog: readonly Station[], initial: FilterState): {
  update: (filters: FilterState) => void; destroy: () => void;
} {
  let state = initial;
  let outcome: Outcome = 'resp';
  const root = element('div', 'health-dashboard');
  const summaryPanel = element('section', 'panel health-summary-panel');
  const header = element('header', 'panel-header health-summary-header');
  const titleGroup = element('div', 'health-summary-title');
  titleGroup.append(
    element('h3', '', 'Paparan dan Admisi'),
    element('p', '', 'Telusuri hubungan polutan dengan kasus harian di faskes pilihan.')
  );
  const selector = searchableSelect('health-outcome', 'Indikator kesehatan', value => {
    if (isOutcome(value)) { outcome = value; update(state); }
  });
  selector.setOptions(Object.entries(OUTCOMES), outcome);
  header.append(titleGroup, selector.field);

  const scope = element('p', 'health-scope sr-only');
  scope.setAttribute('role', 'status');
  const coverage = element('p', 'health-coverage');
  const metrics = element('div', 'metrics-grid health-metrics');

  const body = element('div', 'panel-body');
  body.append(scope, metrics, coverage);
  summaryPanel.append(header, body);
  const trends = panel('Paparan & Kasus Harian', 'Dua skala terpisah dengan kalender yang sama.', 'health-trends');
  const exposureTitle = element('h4', 'health-plot-title');
  const exposureHost = element('div');
  const outcomeTitle = element('h4', 'health-plot-title');
  const outcomeHost = element('div');
  trends.body.append(exposureTitle, exposureHost, outcomeTitle, outcomeHost,
    element('p', 'panel-footnote', 'Konsentrasi: rata-rata stasiun tersedia per hari. Kasus: jumlah seluruh faskes pilihan; cakupan keduanya dapat berbeda.'));

  // Kelompok 1: Hubungan Paparan & Respons Kasus (50:50 Baris Terpadu)
  const doseLagPanel = panel('Hubungan Paparan & Respons Kasus', 'Korelasi jeda waktu (lag) dan variasi admisi menurut gradien konsentrasi polutan.');
  const doseLagGrid = element('div', 'health-split-grid');

  // Subkolom 1: Jeda Paparan & Kasus (Line Chart)
  const lagCol = element('div', 'health-col');
  const lagHeader = element('div', 'health-sub-header');
  lagHeader.append(
    element('h4', '', 'Jeda Paparan & Kasus'),
    element('p', '', 'Korelasi Pearson eksploratif paparan t−k terhadap admisi hari t · lag 0–7 hari')
  );
  const lagHost = element('div');
  const lagCaption = element('p', 'panel-footnote');
  lagCol.append(lagHeader, lagHost, lagCaption);

  // Subkolom 2: Kasus Menurut Tingkat Paparan (Bar Chart)
  const responseCol = element('div', 'health-col');
  const responseHeader = element('div', 'health-sub-header');
  const responseSubtitle = element('p', '', 'Kuintil pasangan paparan pada pilihan');
  responseHeader.append(
    element('h4', '', 'Kasus Menurut Tingkat Paparan'),
    responseSubtitle
  );
  const responseHost = element('div');
  const responseFootnote = element('p', 'panel-footnote', 'Kuintil pasangan terpilih; rerata perubahan per faskes terhadap reratanya sendiri, bukan estimasi risiko.');
  responseCol.append(responseHeader, responseHost, responseFootnote);

  doseLagGrid.append(lagCol, responseCol);
  doseLagPanel.body.append(doseLagGrid);

  // Kelompok 2: Episode Ekstrem & Kelompok Rentan (50:50 Baris Terpadu)
  // Ditukar: Chart 1 = Perubahan Admisi Balita & Lansia (Bar), Chart 2 = Kasus di Sekitar Episode Paparan (Line)
  const vulnerabilityPanel = panel('Episode Ekstrem & Stratifikasi Kelompok Rentan', 'Diferensiasi dampak pada balita vs lansia serta dinamika kasus di sekitar episode polusi puncak.');
  const vulnerabilityGrid = element('div', 'health-split-grid');

  // Subkolom 1: Perubahan Admisi Balita & Lansia (Bar Chart)
  const ageCol = element('div', 'health-col');
  const ageHeader = element('div', 'health-sub-header');
  const ageScope = element('p', ''); ageScope.id = 'health-age-scope'; ageScope.setAttribute('aria-live', 'polite');
  ageHeader.append(
    element('h4', '', 'Perubahan Admisi Balita & Lansia'),
    ageScope
  );
  const ageHost = element('div');
  const ageFootnote = element('p', 'panel-footnote', 'P1–P5: paparan relatif per faskes (0% = rerata periode). Admisi pernapasan kedua umur; deskriptif tanpa penyesuaian cuaca/populasi.');
  ageCol.append(ageHeader, ageHost, ageFootnote);

  // Subkolom 2: Kasus di Sekitar Episode Paparan (Line Chart)
  const eventCol = element('div', 'health-col');
  const eventHeader = element('div', 'health-sub-header');
  eventHeader.append(
    element('h4', '', 'Kasus di Sekitar Episode Paparan'),
    element('p', '', 'Perubahan terhadap baseline hari −3…−1 · awal episode di atas P90 historis 2024')
  );
  const eventHost = element('div');
  const eventCaption = element('p', 'panel-footnote');
  eventCol.append(eventHeader, eventHost, eventCaption);

  vulnerabilityGrid.append(ageCol, eventCol);
  vulnerabilityPanel.body.append(vulnerabilityGrid);

  const strainPanel = panel('Tekanan Admisi Pernapasan dan CVD', 'Jumlah catatan admisi per 100 tempat tidur tercatat · bukan keterisian');
  const strainHost = element('div'), strainCaption = element('p', 'panel-footnote'); strainPanel.body.append(strainHost, strainCaption);
  const warning = element('p', 'health-quality');
  root.append(summaryPanel, warning, trends.root, doseLagPanel.root, vulnerabilityPanel.root, strainPanel.root);
  host.replaceChildren(root);
  const exposureChart = healthPlot(exposureHost, 'health-exposure', 'line', 'µg/m³');
  const admissionsChart = healthPlot(outcomeHost, 'health-admissions', 'line', 'Kasus / hari');
  const lagChart = healthPlot(lagHost, 'health-lag', 'line', 'Pearson r', { min: -1, max: 1 });
  const responseChart = healthPlot(responseHost, 'health-response', 'bar', '% vs rerata faskes');

  const ageChart = ageComparisonChart(ageHost);
  ageHost.querySelector('canvas')?.setAttribute('aria-describedby', ageScope.id);
  const eventChart = healthPlot(eventHost, 'health-events', 'line', 'Perubahan (%)');
  const strainChart = healthPlot(strainHost, 'health-strain', 'line', 'Catatan /100 tempat tidur/hari');

  function update(filters: FilterState): void {
    state = filters;
    const result = summarizeHealth(data, catalog, filters, outcome);
    const pollutant = filters.pollutant ?? 'PM2.5';
    const start = result.dates[0], end = result.dates.at(-1);
    scope.textContent = `${result.hospitals} faskes pilihan · ${start && end ? period(start, end) : 'Periode kosong'} · ${pollutant} · ${filters.includeSuspect ? 'VALID + SUSPECT' : 'VALID'}`;
    const countUnit = outcome === 'death' ? 'kematian/hari' : 'kasus/hari';
    const cards = [
      metric(OUTCOMES[outcome], display(result.average), countUnit, 'Rata-rata harian seluruh faskes pilihan'),
      metric('Pernapasan Balita <5 Tahun', display(result.under5), 'admisi/hari', 'Rata-rata harian · dihitung terpisah'),
      metric('Pernapasan Lansia >60 Tahun', display(result.over60), 'admisi/hari', 'Rata-rata harian · dihitung terpisah'),
      metric('Beban Admisi Pernapasan', display(mean(result.burden.filter((n): n is number => n !== null))), 'per 100 tempat tidur', `${number(result.beds)} tempat tidur · bukan keterisian`),
    ];
    metrics.replaceChildren(...cards);
    coverage.textContent = `Pasangan ${pollutant}–${OUTCOMES[outcome].toLowerCase()}: ${number(result.pairs)} / ${number(result.possiblePairs)} faskes-hari (${result.possiblePairs ? number(result.pairs / result.possiblePairs * 100) : '0'}%). Beban admisi memakai pernapasan umum, terlepas dari indikator pilihan.`;
    warning.textContent = result.unscaled
      ? `${result.unscaled} stasiun memakai satuan logger yang belum terverifikasi untuk ${pollutant}; data kesehatannya tetap ditampilkan. Analisis pasangan memakai paparan yang tersedia.`
      : 'Filter polutan dan QC mengubah paparan; catatan kesehatan tetap mengikuti faskes dan periode pilihan.';
    exposureTitle.textContent = `${pollutant} · rata-rata stasiun tersedia`;
    outcomeTitle.textContent = `${OUTCOMES[outcome]} · seluruh faskes pilihan`;
    const dailyLabels = result.dates.map(compactDate);
    exposureChart.update(dailyLabels, result.exposure, `${pollutant} (µg/m³)`, result.dates.map((value, i) => `${date(value)} · ${result.coverageByDay[i] ?? 0} stasiun`));
    admissionsChart.update(dailyLabels, result.daily, OUTCOMES[outcome], result.dates.map(date));
    lagChart.update(result.lags.map(item => String(item.lag)), result.lags.map(item => item.correlation), 'Korelasi paparan–kasus', result.lags.map(item => `${item.hospitals} faskes · ${number(item.pairs)} pasangan`));
    responseChart.update(result.bins.map(item => item.label), result.bins.map(item => item.change), OUTCOMES[outcome],
      result.bins.map(item => `${pollutant} ${item.label} µg/m³ · ${number(item.facilities)} faskes · ${number(item.pairs)} pasangan · rerata ${display(item.cases)} kasus`));
    const availableLags = result.lags.filter(item => item.correlation !== null);
    const peak = availableLags.reduce<typeof availableLags[number] | null>((best, item) => best === null || (item.correlation ?? -2) > (best.correlation ?? -2) ? item : best, null);
    const ageResult = compareAgeGroups(data, catalog, filters);
    ageChart.update(ageResult);
    ageScope.textContent = `${pollutant} · ${ageResult.facilities}/${ageResult.selectedFacilities} faskes · baseline balita ${display(ageResult.baselineUnder5)}, lansia ${display(ageResult.baselineOver60)} admisi/faskes/hari.`;
    const eventValues = result.episodes.changes.filter((value): value is number => value !== null);
    const eventLow = eventValues.length ? Math.min(0, ...eventValues) : 0;
    const eventHigh = eventValues.length ? Math.max(0, ...eventValues) : 1;
    const eventPad = (eventHigh - eventLow) * 0.1 || 1;
    eventChart.update(Array.from({ length: 11 }, (_, i) => String(i - 3)), result.episodes.changes, `Perubahan ${OUTCOMES[outcome]}`,
      result.episodes.admissions.map(value => value === null ? 'Kasus tidak tersedia' : `${display(value)} kasus/faskes-episode`),
      { min: eventLow < 0 ? eventLow - eventPad : 0, max: eventHigh + eventPad });
    eventCaption.textContent = `${number(result.episodes.events)} episode dari ${number(result.episodes.hospitals)} faskes · rerata perubahan terhadap baseline hari −3…−1 · deskriptif, bukan kausal.`;
    strainChart.update(dailyLabels, result.strain, 'Catatan pernapasan + CVD /100 tempat tidur/hari', result.dates.map(date));
    strainCaption.textContent = `Puncak ${display(result.strainPeak)} catatan/100 tempat tidur/hari. Jumlah pernapasan + CVD belum dideduplikasi antar-diagnosis; bukan jumlah pasien unik, BOR, atau kebutuhan tempat tidur.`;
    lagCaption.textContent = `${peak ? `Korelasi tertinggi pada jeda ${peak.lag} hari (r=${number(peak.correlation ?? 0)}). ` : ''}Rata-rata Pearson per faskes (≥30 pasangan). Eksploratif tanpa penyesuaian cuaca/musim; bukan kausal.`;
    responseSubtitle.textContent = `${pollutant} (µg/m³) · kuintil pasangan paparan pada pilihan`;
  }
  update(initial);
  return { update, destroy: () => {
    selector.destroy(); ageChart.destroy(); eventChart.destroy(); strainChart.destroy(); exposureChart.destroy(); admissionsChart.destroy(); lagChart.destroy(); responseChart.destroy(); root.remove();
  } };
}
function isOutcome(value: string): value is Outcome { return Object.hasOwn(OUTCOMES, value); }
