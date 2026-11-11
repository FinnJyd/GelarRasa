import type { DashboardData, FilterState } from '../../data/types';
import { createStationMap } from '../../components/station-map';
import { createDistributionChart } from '../../shared/charts';
import { stationTable } from '../../shared/station-table';
import { button, element, emptyState } from '../../shared/dom';
import { number, period, shortCity } from '../../shared/format';
import { icon } from '../../shared/icons';
import { metric, panel } from '../../shared/panel';
import { filterStations, summarize } from './model';

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

  const geography = panel('Sebaran Geospasial & Pemetaan Stasiun AQMS Nasional', 'Pemetaan stasiun pemantau telemetri dengan radius frekuensi pelanggaran 24 jam dan acuan tahunan.', 'geography-panel');
  const mapHost = element('div', 'map-host');
  geography.body.append(mapHost);
  const tableHost = element('div', 'overview-table');
  const footer = element('footer', 'overview-footer');
  const quality = button('', 'data-note');
  quality.append(icon('info'), element('span', '', 'Data sementara · lihat batasan analisis'));
  quality.addEventListener('click', () => openMethodology(quality), { signal: controller.signal });
  scope.append(quality);
  footer.append(element('p', '', 'Sumber: telemetri AQMS & data kesehatan · Dataset sintetis'));
  root.append(scope, indicators.root, geography.root, tableHost, footer);
  host.replaceChildren(root);
  const distributionChart = createDistributionChart(compositionHost);
  let stationMap: ReturnType<typeof createStationMap> | null = null;
  try { stationMap = createStationMap(mapHost, data.reference); }
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
      metric('Indeks Beban Hospital (Faskes)', number(data.hospital.burden), '%', `${number(data.hospital.dailyAdmissions)} admisi/hari ÷ ${number(data.hospital.beds)} tempat tidur · seluruh rumah sakit, bukan keterisian`),
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
    tableHost.replaceChildren(stationTable(stations));
    stationMap?.update(stations);
  }
  update(initial);
  return {
    update,
    destroy: () => {
      controller.abort();
      distributionChart.destroy();
      stationMap?.destroy();
      stationMap = null;
      root.remove();
    },
  };
}
