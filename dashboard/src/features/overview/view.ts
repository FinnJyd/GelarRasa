import type { DashboardData, FilterState } from '../../data/types';
import { createStationMap } from '../../components/station-map';
import { createDistributionChart } from '../../shared/charts';
import { stationTable } from '../../shared/station-table';
import { element, emptyState } from '../../shared/dom';
import { number, shortCity } from '../../shared/format';
import { icon } from '../../shared/icons';
import { metric, panel } from '../../shared/panel';
import { computeHospitalBurden, filterStations, selectObservations, summarize } from './model';

export function mountOverview(
  host: HTMLElement,
  data: DashboardData,
  initial: FilterState,
  _openMethodology?: (invoker: HTMLElement) => void,
): { update: (state: FilterState) => void; destroy: () => void } {
  const controller = new AbortController();
  const root = element('div', 'overview');
  const unitNote = element('p', 'panel-footnote');
  unitNote.hidden = true;
  const hero = element('div', 'overview-hero');
  const indicators = panel('Indikator Kunci & Distribusi Kualitas Udara Nasional', 'Ringkasan konsentrasi pencemar, frekuensi hari di atas acuan 24 jam, dan kategori dominan stasiun.', 'indicators-panel');
  const metrics = element('div', 'metrics-grid');
  const composition = panel('Kategori ISPU Dominan Stasiun', 'Kategori harian dominan · stasiun terukur', 'composition-panel');
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
  footer.append(element('p', '', 'Sumber: telemetri AQMS & data kesehatan · Dataset sintetis'));
  root.append(unitNote, indicators.root, geography.root, tableHost, footer);
  host.replaceChildren(root);
  const distributionChart = createDistributionChart(compositionHost);
  let stationMap: ReturnType<typeof createStationMap> | null = null;
  try { stationMap = createStationMap(mapHost, data.reference); }
  catch { mapHost.append(emptyState('Peta tidak tersedia', 'Lihat lokasi pada tabel data.')); }

  function update(state: FilterState): void {
    const stations = selectObservations(data.stations, state, data.cube);
    const result = summarize(stations);
    const fullScope = stations.length === data.stations.length;
    const exceedance = result.exceedanceMean;
    const activeStart = state.startDate ?? data.start;
    const activeEnd = state.endDate ?? data.end;
    const activePollutant = state.pollutant ?? 'PM2.5';

    const polKey = activePollutant.toLowerCase().replace('.', '');
    const selectedCatalog = filterStations(data.stations, state);
    const unscaled = selectedCatalog.filter(station => data.cube?.stations[station.code]?.unavailable.includes(polKey)).length;
    unitNote.hidden = unscaled === 0;
    unitNote.textContent = `${unscaled} stasiun pilihan belum memiliki konversi logger ${activePollutant}; nilainya tidak dimasukkan dalam indikator udara.`;
    const polThreshold = data.cube?.thresholds[polKey] ?? {
      label: activePollutant,
      unit: 'µg/m³',
      pp22_24h: data.reference.daily,
      pp22_annual: data.reference.annual,
    };
    const limit24h = polThreshold.pp22_24h;
    const unit = polThreshold.unit;

    const selectedCodes = selectedCatalog.map(s => s.code);
    const activeHospital = data.cube
      ? computeHospitalBurden(data.cube, activeStart, activeEnd, selectedCodes)
      : { ...data.hospital, hospitalCount: data.hospital.hospitals };

    let hospitalContext: string;
    if (activeHospital.hospitalCount === 1 && activeHospital.hospitalName) {
      hospitalContext = `${activeHospital.hospitalName} · ${number(activeHospital.dailyAdmissions)} admisi/hari ÷ ${number(activeHospital.beds)} kasur`;
    } else if (activeHospital.hospitalCount && activeHospital.hospitalCount < data.stations.length) {
      hospitalContext = `${number(activeHospital.dailyAdmissions)} admisi/hari ÷ ${number(activeHospital.beds)} kasur · ${activeHospital.hospitalCount} faskes terpilih`;
    } else {
      hospitalContext = `${number(activeHospital.dailyAdmissions)} admisi/hari ÷ ${number(activeHospital.beds)} kasur · seluruh faskes rujukan`;
    }

    const symbols = ['wind', 'activity', 'pin', 'heart'];
    const metricIcon = (name: string): HTMLElement => {
      const symbol = element('span', 'metric-icon');
      symbol.append(icon(name));
      return symbol;
    };

    const cards = [
      metric(
        fullScope ? `Rata-rata ${activePollutant} Stasiun Terukur` : `Rata-rata ${activePollutant} Pilihan`,
        result.mean === null ? '—' : number(result.mean),
        unit,
        'Rata-rata periode · bobot sama per stasiun terukur',
        metricIcon(symbols[0] ?? 'wind'),
      ),
      metric(
        'Persentase Hari Melebihi Batas',
        exceedance === null ? '—' : number(exceedance),
        '%',
        `Hari > ${number(limit24h)} ${unit} · rata-rata stasiun terukur`,
        metricIcon(symbols[1] ?? 'activity'),
      ),
      metric(
        'Stasiun Paling Kritis',
        result.highest?.code ?? '—',
        '',
        result.highest
          ? `${shortCity(result.highest.city)} · ${number(result.highest.average)} ${unit} · ${number(result.highest.exceedance)}% hari > acuan`
          : 'Tidak ada data terukur',
        metricIcon(symbols[2] ?? 'pin'),
      ),
      metric(
        'Indeks Beban Hospital (Faskes)',
        activeHospital.beds === 0 ? '—' : number(activeHospital.burden),
        '%',
        hospitalContext,
        metricIcon(symbols[3] ?? 'heart'),
      ),
    ];
    cards[2]?.classList.add('metric-station');
    metrics.replaceChildren(...cards);
    distributionChart.update(result.distribution, result.measured);
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
