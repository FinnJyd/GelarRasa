import { searchableSelect } from '../../components/search-select';
import { button, element } from '../../shared/dom';
import { metric, panel } from '../../shared/panel';
import {
  createCorrelationHeatmap,
  createExtremeComparisonChart,
  createPollutionRose,
  createTrafficScatter,
  createWindBinsChart,
} from './charts';
import {
  getCorrelationMatrix,
  getCorrelationStations,
  getExtremeVsNormal,
  getRoseData,
  getTrafficScatterPoints,
  getWindBinsForSiteType,
  getWindBinSiteTypes,
} from './model';
import type { CorrelationMode, DriversData } from './types';

export function mountDriversView(host: HTMLElement, data: DriversData): {
  destroy: () => void;
} {
  const root = element('div', 'drivers-dashboard');

  // Summary Metrics Grid
  const metricsGrid = element('div', 'metrics-grid');
  const ext = data.extreme_vs_normal;
  const hazePercent = (ext.extreme.haze_season_share * 100).toFixed(1);

  metricsGrid.append(
    metric(
      'Pemicu Ekstrem Utama',
      `${hazePercent}%`,
      'terjadi di musim karhutla',
      `Bulan Agu–Okt menyumbang ${hazePercent}% seluruh jam ekstrem`,
    ),
    metric(
      'Stagnasi Kecepatan Angin',
      `${ext.extreme.median_wind_speed}`,
      'm/s (ekstrem)',
      `Lebih rendah dibanding jam normal (${ext.normal.median_wind_speed} m/s) · disipasi lambat`,
    ),
    metric(
      'Ambang Ekstrem P95',
      `${ext.threshold_pm25}`,
      'µg/m³',
      'Persentil 95 konsentrasi PM2.5 seluruh stasiun',
    ),
    metric(
      'Observasi Koridor Emisi',
      '27',
      'stasiun AQMS',
      'Mencakup zonasi lalu lintas, industri, peatland, dan background',
    ),
  );

  // Panel 1: Mawar Polusi (Decision 3A: Three fixed small-multiple panels)
  const rosePanel = panel(
    'Mawar Polusi (Pollution Rose): Arah Angin & Asal Emisi',
    'Distribusi konsentrasi rata-rata PM2.5 pada 16 sektor arah angin, mengecualikan angin tenang (<0.5 m/s).',
  );
  const roseContainer = element('div', 'rose-small-multiples');
  roseContainer.style.display = 'flex';
  roseContainer.style.flexWrap = 'wrap';
  roseContainer.style.gap = '16px';
  roseContainer.style.justifyContent = 'space-around';

  const roseKTG = createPollutionRose(roseContainer, 'Hotspot Karhutla: AQMS-KTG-01 (Ketapang)');
  const roseJKT = createPollutionRose(roseContainer, 'Koridor Perkotaan: AQMS-JKT-01 (Jakarta Pusat)');
  const roseKTB = createPollutionRose(roseContainer, 'Latar Bersih: AQMS-KTB-01 (Kota Baru)');

  const roseFootnote = element(
    'p',
    'panel-footnote',
    'Sektor polar menunjukkan arah datangnya angin. Di stasiun hotspot (KTG-01), angin dari tenggara dan selatan membawa konsentrasi PM2.5 tertinggi dari lahan gambut yang terbakar. Di Jakarta (JKT-01), konsentrasi merata di segala arah mencerminkan emisi lokal.',
  );
  rosePanel.body.append(roseContainer, roseFootnote);

  roseKTG.update(getRoseData(data, 'AQMS-KTG-01'));
  roseJKT.update(getRoseData(data, 'AQMS-JKT-01'));
  roseKTB.update(getRoseData(data, 'AQMS-KTB-01'));

  // Panel 2: Matriks Korelasi Spearman
  const corrPanel = panel(
    'Matriks Korelasi Spearman: 6 Polutan vs Parameter Cuaca',
    'Hubungan non-parametrik antara polutan dengan suhu, kelembapan, dan kecepatan angin per musim.',
  );
  const corrControls = element('div', 'corr-controls');
  corrControls.style.display = 'flex';
  corrControls.style.flexWrap = 'wrap';
  corrControls.style.alignItems = 'center';
  corrControls.style.gap = '12px';
  corrControls.style.marginBottom = '12px';

  const corrStations = getCorrelationStations(data);
  let selectedCorrStation = corrStations.includes('AQMS-KTG-01') ? 'AQMS-KTG-01' : (corrStations[0] ?? '');
  let selectedCorrMode: CorrelationMode = 'all';

  const corrStationSelect = searchableSelect('corr-station-filter', 'Pilih Stasiun', val => {
    if (val && corrStations.includes(val)) {
      selectedCorrStation = val;
      updateCorr();
    }
  });
  corrStationSelect.setOptions(corrStations.map(c => [c, c]), selectedCorrStation);

  const modeGroup = element('div', 'segmented-controls');
  modeGroup.style.display = 'inline-flex';
  modeGroup.style.gap = '6px';
  const btnAll = button('Sepanjang Tahun', 'button button-primary');
  const btnHaze = button('Musim Karhutla (Agu–Okt)', 'button button-outline');
  const btnNonHaze = button('Bulan Lainnya (Nov–Jul)', 'button button-outline');
  modeGroup.append(btnAll, btnHaze, btnNonHaze);

  btnAll.addEventListener('click', () => {
    selectedCorrMode = 'all';
    btnAll.className = 'button button-primary';
    btnHaze.className = 'button button-outline';
    btnNonHaze.className = 'button button-outline';
    updateCorr();
  });
  btnHaze.addEventListener('click', () => {
    selectedCorrMode = 'haze';
    btnAll.className = 'button button-outline';
    btnHaze.className = 'button button-primary';
    btnNonHaze.className = 'button button-outline';
    updateCorr();
  });
  btnNonHaze.addEventListener('click', () => {
    selectedCorrMode = 'nonhaze';
    btnAll.className = 'button button-outline';
    btnHaze.className = 'button button-outline';
    btnNonHaze.className = 'button button-primary';
    updateCorr();
  });

  corrControls.append(corrStationSelect.field, modeGroup);
  const corrHost = element('div');
  const corrFootnote = element(
    'p',
    'panel-footnote',
    'Arah angin bersifat sirkular sehingga dipisahkan ke mawar polusi. Korelasi Spearman dapat berbalik tanda antara musim normal dan musim karhutla karena interaksi suhu dan konveksi udara.',
  );
  corrPanel.body.append(corrControls, corrHost, corrFootnote);
  const corrHeatmap = createCorrelationHeatmap(corrHost);

  function updateCorr(): void {
    const mat = getCorrelationMatrix(data, selectedCorrStation, selectedCorrMode);
    const modeLabel =
      selectedCorrMode === 'all'
        ? 'Sepanjang Tahun'
        : selectedCorrMode === 'haze'
        ? 'Musim Karhutla'
        : 'Non-Karhutla';
    corrHeatmap.update(mat, selectedCorrStation, modeLabel);
  }
  updateCorr();

  // Panel 3: Dispersi Angin
  const windPanel = panel(
    'Efek Dispersi Angin (Binned Plot: Kecepatan Angin vs PM2.5)',
    'Kurva penurunan polusi seiring meningkatnya kecepatan angin: membedakan emisi lokal vs kabut asap regional.',
  );
  const windControls = element('div', 'wind-controls');
  windControls.style.display = 'flex';
  windControls.style.flexWrap = 'wrap';
  windControls.style.gap = '8px';
  windControls.style.marginBottom = '12px';

  const allSiteTypes = getWindBinSiteTypes(data);
  const defaultSiteTypes = [
    'Peatland Boundary',
    'Urban Background',
    'Traffic / Roadside',
    'Regional / Clean Background',
  ].filter(st => allSiteTypes.includes(st));

  const activeSiteTypes = new Set<string>(defaultSiteTypes);

  defaultSiteTypes.forEach(st => {
    const btn = button(st, 'button button-primary');
    btn.style.fontSize = '12px';
    btn.style.padding = '4px 10px';
    btn.addEventListener('click', () => {
      if (activeSiteTypes.has(st)) {
        if (activeSiteTypes.size > 1) {
          activeSiteTypes.delete(st);
          btn.className = 'button button-outline';
        }
      } else {
        activeSiteTypes.add(st);
        btn.className = 'button button-primary';
      }
      updateWindBins();
    });
    windControls.append(btn);
  });

  const windHost = element('div');
  const windFootnote = element(
    'p',
    'panel-footnote',
    'Pada zonasi perkotaan/jalan raya, kecepatan angin >2 m/s mendilusi polutan lokal secara signifikan. Sebaliknya, zonasi terdampak karhutla memiliki konsentrasi tetap tinggi karena suplai asap berskala regional.',
  );
  windPanel.body.append(windControls, windHost, windFootnote);
  const windBinsChart = createWindBinsChart(windHost);

  function updateWindBins(): void {
    const siteBins: Record<string, readonly any[]> = {};
    activeSiteTypes.forEach(st => {
      siteBins[st] = getWindBinsForSiteType(data, st);
    });
    windBinsChart.update(siteBins, Array.from(activeSiteTypes));
  }
  updateWindBins();

  // Panel 4: Scatter Lalu Lintas
  const trafficPanel = panel(
    'Intensitas Lalu Lintas vs Gas Buang Kendaraan (NO2 & CO)',
    'Hubungan volume kendaraan rata-rata per jam terhadap pembentukan polutan gas pembakaran.',
  );
  const trafficControls = element('div', 'traffic-controls');
  trafficControls.style.display = 'flex';
  trafficControls.style.gap = '8px';
  trafficControls.style.marginBottom = '12px';

  let currentTrafficPollutant: 'no2' | 'co' = 'no2';
  const btnNO2 = button('Gas NO2 (µg/m³)', 'button button-primary');
  const btnCO = button('Gas CO (µg/m³)', 'button button-outline');
  trafficControls.append(btnNO2, btnCO);

  btnNO2.addEventListener('click', () => {
    currentTrafficPollutant = 'no2';
    btnNO2.className = 'button button-primary';
    btnCO.className = 'button button-outline';
    updateTraffic();
  });
  btnCO.addEventListener('click', () => {
    currentTrafficPollutant = 'co';
    btnNO2.className = 'button button-outline';
    btnCO.className = 'button button-primary';
    updateTraffic();
  });

  const trafficHost = element('div');
  const trafficFootnote = element(
    'p',
    'panel-footnote',
    'Data mencakup 27 stasiun. Titik dikelompokkan berdasarkan tipologi zonasi pemantau. Gas nitrogen dioksida (NO2) dan karbon monoksida (CO) merupakan indikator primer emisi bahan bakar fosil.',
  );
  trafficPanel.body.append(trafficControls, trafficHost, trafficFootnote);
  const trafficChart = createTrafficScatter(trafficHost);

  function updateTraffic(): void {
    const points = getTrafficScatterPoints(data);
    trafficChart.update(points, currentTrafficPollutant);
  }
  updateTraffic();

  // Panel 5: Pemicu Utama Konsentrasi Ekstrem
  const extremePanel = panel(
    'Pemicu Utama Konsentrasi Ekstrem (Jam >P95 vs Jam Normal)',
    'Komparasi kondisi lingkungan saat terjadi lonjakan polusi ekstrem di atas persentil 95 (109.8 µg/m³).',
  );
  const extremeHost = element('div');
  const extremeFootnote = element(
    'p',
    'panel-footnote',
    'Faktor kunci pembentuk episode ekstrem: (1) Musim kemarau/karhutla (Agustus–Oktober) yang menyumbang 96.4% dari total jam ekstrem; (2) Kecepatan angin rendah yang menghambat ventilasi; (3) Puncak lonjakan pada jam 06:00–08:00 pagi akibat kombinasi asap malam yang terjebak inversi suhu.',
  );
  extremePanel.body.append(extremeHost, extremeFootnote);
  const extremeChart = createExtremeComparisonChart(extremeHost);
  extremeChart.update(getExtremeVsNormal(data));

  // Assemble full layout
  root.append(
    metricsGrid,
    rosePanel.root,
    corrPanel.root,
    windPanel.root,
    trafficPanel.root,
    extremePanel.root,
  );
  host.replaceChildren(root);

  return {
    destroy: () => {
      roseKTG.destroy();
      roseJKT.destroy();
      roseKTB.destroy();
      corrStationSelect.destroy();
      corrHeatmap.destroy();
      windBinsChart.destroy();
      trafficChart.destroy();
      extremeChart.destroy();
      root.remove();
    },
  };
}

