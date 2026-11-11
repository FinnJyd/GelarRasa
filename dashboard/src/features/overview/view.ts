import type { DashboardData, FilterState } from '../../data/types';
import { createStationMap } from '../../components/station-map';
import { createDistributionChart, createRankingChart } from '../../shared/charts';
import { stationTable } from '../../shared/station-table';
import { button, element, emptyState } from '../../shared/dom';
import { number, period, shortCity } from '../../shared/format';
import { icon } from '../../shared/icons';
import { metric, panel } from '../../shared/panel';
import { filterStations, rankingGroups, summarize } from './model';

export function mountOverview(
  host: HTMLElement,
  data: DashboardData,
  initial: FilterState,
  openMethodology: (invoker: HTMLElement) => void,
): { update: (state: FilterState) => void; destroy: () => void } {
  const controller = new AbortController();
  const root = element('div', 'overview');
  const scope = element('div', 'scope-strip');
  const scopeCount = element('span', 'scope-count');
  scope.append(scopeCount, element('span', '', `${period(data.start, data.end)} · PM2.5`));
  const hero = element('div', 'overview-hero');
  const indicators = panel('Indikator Kunci & Distribusi Kualitas Udara Nasional', 'Ringkasan PM2.5, frekuensi hari di atas acuan 24 jam, dan kategori dominan stasiun.', 'indicators-panel');
  const metrics = element('div', 'metrics-grid');
  const composition = panel('Kategori ISPU Dominan Stasiun', 'Kategori harian dominan · per stasiun', 'composition-panel');
  const compositionHost = element('div', 'composition-chart-host');
  composition.body.append(compositionHost);
  composition.body.append(element('p', 'panel-footnote', 'Modus kategori harian, bukan kategori rata-rata.'));
  hero.append(metrics, composition.root);
  indicators.body.append(hero, element('p', 'panel-footnote', `Acuan pada ekspor: PP 22/2021 · 24 jam ${number(data.reference.daily)} µg/m³ · tahunan ${number(data.reference.annual)} µg/m³; WHO 2021 · tahunan ${number(data.reference.whoAnnual)} µg/m³. Rata-rata periode bukan hasil audit kepatuhan tahunan.`));

  const rankings = element('div', 'rankings-grid');
  const high = panel('Konsentrasi tertinggi', 'Rata-rata PM2.5 · µg/m³', 'ranking-panel');
  const low = panel('Konsentrasi terendah', 'Rata-rata PM2.5 · µg/m³', 'ranking-panel');
  const highCaption = element('p', 'chart-caption');
  const lowCaption = element('p', 'chart-caption');
  rankings.append(high.root, low.root);

  const lower = element('div', 'geography-grid');
  const geography = panel('Sebaran Geospasial & Pemetaan Stasiun AQMS Nasional', 'Jelajahi lokasi, kategori dominan, dan konsentrasi stasiun terpilih.', 'geography-panel');
  const mapHost = element('div', 'map-host');
  geography.body.append(mapHost);
  const health = panel('Admisi pernapasan', 'Seluruh rumah sakit · cakupan tetap', 'health-panel');
  const healthMark = element('div', 'health-mark');
  healthMark.append(icon('heart'));
  const healthValue = element('div', 'health-value');
  healthValue.append(element('strong', '', number(data.hospital.burden)), element('span', '', '%'));
  const healthFacts = element('div', 'health-facts');
  const admissions = element('div');
  admissions.append(element('strong', '', number(data.hospital.dailyAdmissions)), element('span', '', 'admisi / hari'));
  const capacity = element('div');
  capacity.append(element('strong', '', number(data.hospital.beds)), element('span', '', 'tempat tidur'));
  healthFacts.append(admissions, element('span', 'health-divider', '÷'), capacity);
  health.body.append(
    healthMark, healthValue,
    element('p', 'health-description', 'Rasio admisi harian terhadap kapasitas'),
    healthFacts,
    element('p', 'health-scope', `${data.hospital.hospitals} rumah sakit · balita & lansia`),
    element('p', 'panel-footnote', 'Bukan keterisian tempat tidur. Tidak mengikuti filter stasiun.'),
  );
  lower.append(geography.root, health.root);

  const tableHost = element('div', 'overview-table');
  const footer = element('footer', 'overview-footer');
  const quality = button('', 'data-note');
  quality.append(icon('info'), element('span', '', 'Data sementara · lihat batasan analisis'));
  quality.addEventListener('click', () => openMethodology(quality), { signal: controller.signal });
  scope.append(quality);
  footer.append(element('p', '', 'Sumber: telemetri AQMS & data kesehatan · Dataset sintetis'));
  root.append(scope, indicators.root, rankings, lower, tableHost, footer);
  host.replaceChildren(root);
  const distributionChart = createDistributionChart(compositionHost);
  const highChart = createRankingChart(high.body, 'Stasiun dengan konsentrasi tertinggi');
  const lowChart = createRankingChart(low.body, 'Stasiun dengan konsentrasi terendah');
  high.body.append(highCaption);
  low.body.append(lowCaption);
  let stationMap: ReturnType<typeof createStationMap> | null = null;
  try { stationMap = createStationMap(mapHost); }
  catch { mapHost.append(emptyState('Peta tidak tersedia', 'Lihat lokasi pada tabel data.')); }

  function update(state: FilterState): void {
    const stations = filterStations(data.stations, state);
    const result = summarize(stations);
    scopeCount.textContent = `${stations.length} dari ${data.stations.length} stasiun`;
    const fullScope = stations.length === data.stations.length;
    const exceedance = fullScope ? data.nationalExceedance : result.exceedanceMean;
    const cards = [
      metric(fullScope ? 'Rata-rata PM2.5 Nasional' : 'Rata-rata PM2.5 Pilihan', result.mean === null ? '—' : number(result.mean), 'µg/m³', 'Rata-rata periode · bobot sama per stasiun'),
      metric('Persentase Hari Melebihi Batas 24 Jam', exceedance === null ? '—' : number(exceedance), '%',
        `Hari > ${number(data.reference.daily)} µg/m³ · ${fullScope ? 'seluruh hari-stasiun pada ekspor' : 'rata-rata persentase stasiun terpilih'}`),
      metric('Stasiun Paling Kritis', result.highest?.code ?? '—', '',
        result.highest ? `${shortCity(result.highest.city)} · ${number(result.highest.average)} µg/m³ · ${number(result.highest.exceedance)}% hari di atas acuan` : 'Tidak ada stasiun'),
      metric('Indeks Beban Hospital (Faskes)', number(data.hospital.burden), '%', `${number(data.hospital.dailyAdmissions)} admisi/hari ÷ ${number(data.hospital.beds)} tempat tidur · seluruh rumah sakit`),
    ];
    const symbols = ['wind', 'activity', 'pin', 'heart'];
    cards.forEach((card, index) => {
      const symbol = element('span', 'metric-icon');
      symbol.append(icon(symbols[index] ?? 'info'));
      card.prepend(symbol);
      if (index === 2) card.classList.add('metric-station');
    });
    metrics.replaceChildren(...cards);
    distributionChart.update(result.distribution, stations.length);
    const groups = rankingGroups(stations);
    const maximum = Math.ceil((result.highest?.average ?? 0) / 10) * 10;
    highChart.update(groups.high, maximum);
    lowChart.update(groups.low, maximum);
    highCaption.textContent = `${groups.high.length} stasiun · skala 0–${number(maximum)} µg/m³`;
    lowCaption.textContent = `${groups.low.length} stasiun · skala sama, tanpa duplikasi`;
    tableHost.replaceChildren(stationTable(stations));
    stationMap?.update(stations);
  }
  update(initial);
  return {
    update,
    destroy: () => {
      controller.abort();
      distributionChart.destroy();
      highChart.destroy();
      lowChart.destroy();
      stationMap?.destroy();
      stationMap = null;
      root.remove();
    },
  };
}
