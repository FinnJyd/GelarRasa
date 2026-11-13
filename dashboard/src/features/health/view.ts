import type { FilterState, Station } from '../../data/types';
import { searchableSelect } from '../../components/search-select';
import { element } from '../../shared/dom';
import { date, number, period } from '../../shared/format';
import { metric, panel } from '../../shared/panel';
import { healthPlot } from './charts';
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
  const toolbar = element('div', 'health-toolbar');
  const orientation = element('div');
  orientation.append(element('p', 'eyebrow', 'PAPARAN DAN ADMISI'),
    element('p', 'health-orientation', 'Telusuri hubungan polutan dengan kasus harian di faskes pilihan.'));
  const selector = searchableSelect('health-outcome', 'Indikator kesehatan', value => {
    if (isOutcome(value)) { outcome = value; update(state); }
  });
  selector.setOptions(Object.entries(OUTCOMES), outcome);
  toolbar.append(orientation, selector.field);
  const scope = element('p', 'health-scope');
  scope.setAttribute('role', 'status');
  const coverage = element('p', 'health-coverage');
  const metrics = element('div', 'metrics-grid health-metrics');
  const trends = panel('Paparan & Kasus Harian', 'Dua skala terpisah dengan kalender yang sama.', 'health-trends');
  const exposureTitle = element('h4', 'health-plot-title');
  const exposureHost = element('div');
  const outcomeTitle = element('h4', 'health-plot-title');
  const outcomeHost = element('div');
  trends.body.append(exposureTitle, exposureHost, outcomeTitle, outcomeHost,
    element('p', 'panel-footnote', 'Konsentrasi: rata-rata stasiun tersedia per hari. Kasus: jumlah seluruh faskes pilihan; cakupan keduanya dapat berbeda.'));
  const grid = element('div', 'health-analysis-grid');
  const lagPanel = panel('Jeda Paparan & Kasus', 'Korelasi eksploratif · lag 0–7 hari');
  const lagHost = element('div');
  const lagCaption = element('p', 'panel-footnote');
  lagPanel.body.append(lagHost, lagCaption);
  const responsePanel = panel('Kasus Menurut Tingkat Paparan', 'Perbandingan deskriptif · lima kelompok konsentrasi');
  const responseHost = element('div');
  responsePanel.body.append(responseHost,
    element('p', 'panel-footnote', 'Rata-rata kasus per faskes-hari berpasangan. Perbedaan ukuran faskes dan pola musim belum disesuaikan; bukan estimasi risiko.'));
  grid.append(lagPanel.root, responsePanel.root);
  const agePanel = panel('Perubahan Kasus Menurut Kelompok', 'Perbandingan terhadap baseline paparan rendah 2024 · bukan risiko populasi');
  const ageHost = element('div'), ageCaption = element('p', 'panel-footnote'); agePanel.body.append(ageHost, ageCaption);
  const eventPanel = panel('Kasus di Sekitar Episode Paparan', 'Hari −3 sampai +7 · awal episode di atas P90 historis 2024');
  const eventHost = element('div'), eventCaption = element('p', 'panel-footnote'); eventPanel.body.append(eventHost, eventCaption);
  const more = element('div', 'health-analysis-grid'); more.append(agePanel.root, eventPanel.root);
  const strainPanel = panel('Tekanan Admisi Pernapasan dan CVD', 'Jumlah catatan admisi per 100 tempat tidur tercatat · bukan keterisian');
  const strainHost = element('div'), strainCaption = element('p', 'panel-footnote'); strainPanel.body.append(strainHost, strainCaption);
  const warning = element('p', 'health-quality');
  root.append(toolbar, scope, metrics, coverage, warning, trends.root, grid, more, strainPanel.root);
  host.replaceChildren(root);
  const exposureChart = healthPlot(exposureHost, 'health-exposure', 'line', 'µg/m³');
  const admissionsChart = healthPlot(outcomeHost, 'health-admissions', 'line', 'Kasus / hari');
  const lagChart = healthPlot(lagHost, 'health-lag', 'line', 'Pearson r', { min: -1, max: 1 });
  const responseChart = healthPlot(responseHost, 'health-response', 'bar', 'Kasus / faskes-hari');

  const ageChart = healthPlot(ageHost, 'health-ages', 'bar', 'Perubahan (%)');
  const eventChart = healthPlot(eventHost, 'health-events', 'line', 'Kasus / faskes-episode');
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
    responseChart.update(result.bins.map(item => `${number(item.mean)}`), result.bins.map(item => item.admissions), `${OUTCOMES[outcome]} / faskes-hari`, result.bins.map(item => `${item.label} · ${pollutant} µg/m³ · ${number(item.pairs)} pasangan`));
    const availableLags = result.lags.filter(item => item.correlation !== null);
    const peak = availableLags.reduce<typeof availableLags[number] | null>((best, item) => best === null || (item.correlation ?? -2) > (best.correlation ?? -2) ? item : best, null);
    ageChart.update(result.ages.map(item => item.label.replace('Pernapasan ', '').replace(' · semua usia', '')), result.ages.map(item => item.change), 'Perubahan terhadap baseline kelompok', result.ages.map(item => `${item.hospitals} faskes · ${item.baselinePairs} baseline dan ${item.highPairs} faskes-hari paparan tinggi`));
    ageCaption.textContent = 'Baseline tiap faskes: rerata kasus pada paparan ≤P25 tahun 2024. Pembanding: paparan >P75 2024 pada tanggal pilihan. Rerata perubahan berbobot sama per faskes, minimal 10 pasangan per sisi. PPOK dan CVD mencakup semua usia; tidak dianggap khusus lansia.';
    eventChart.update(Array.from({ length: 11 }, (_, i) => String(i - 3)), result.episodes.admissions, `Rerata ${OUTCOMES[outcome]} di sekitar episode`, result.episodes.changes.map(change => change === null ? 'Perubahan belum tersedia' : `Perubahan dari baseline praepisode ${number(change)}%`));
    eventCaption.textContent = `${result.episodes.events} episode lengkap dari ${result.episodes.hospitals} faskes. Awal episode harus didahului satu hari di bawah atau sama dengan P90; jendela tidak bertumpuk. Grafik merata-ratakan catatan kasus per faskes-episode; tooltip menunjukkan perubahan dari rerata hari −3 sampai −1 tiap episode. Minimal tiga episode; hasil deskriptif tanpa kelompok kontrol.`;
    strainChart.update(dailyLabels, result.strain, 'Catatan pernapasan + CVD /100 tempat tidur/hari', result.dates.map(date));
    strainCaption.textContent = `Puncak ${display(result.strainPeak)} catatan/100 tempat tidur/hari. Jumlah pernapasan + CVD belum dideduplikasi antar-diagnosis; bukan jumlah pasien unik, BOR, atau kebutuhan tempat tidur.`;
    lagCaption.textContent = `${peak ? `Korelasi tertinggi pada jeda ${peak.lag} hari (r=${number(peak.correlation ?? 0)}). ` : ''}Paparan pada t−k dibandingkan dengan kasus pada t. Rata-rata Pearson per faskes dengan ≥30 pasangan. Belum disesuaikan terhadap cuaca atau musim; bukan efek kausal.`;
    responsePanel.root.querySelector('.panel-header p')?.replaceChildren(document.createTextNode(`${pollutant} (µg/m³) · kelompok dari konsentrasi rendah ke tinggi`));
  }
  update(initial);
  return { update, destroy: () => {
    selector.destroy(); ageChart.destroy(); eventChart.destroy(); strainChart.destroy(); exposureChart.destroy(); admissionsChart.destroy(); lagChart.destroy(); responseChart.destroy(); root.remove();
  } };
}
function isOutcome(value: string): value is Outcome { return Object.hasOwn(OUTCOMES, value); }
