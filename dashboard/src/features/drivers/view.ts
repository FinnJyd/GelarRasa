import { element, emptyState } from '../../shared/dom';
import { analysisDetails, choiceButton, choiceGroup, setSelected } from '../../shared/analysis-controls';
import { metric, panel } from '../../shared/panel';
import { number, period } from '../../shared/format';
import {
  createCorrelationHeatmap,
  createDriverRankingsChart,
  createExtremeConditionView,
  createExtremeDiurnalChart,
  createPollutionRose,
  createTrafficDualScatter,
  createWindBinsChart,
} from './charts';
import { getTrafficScatterPoints } from './model';
import type { CorrelationMode, DriversData, ThresholdMode } from './types';

export function mountDriversView(
  host: HTMLElement,
  initial: DriversData,
): { update: (data: DriversData) => void; destroy: () => void } {
  let data = initial;
  let corrMode: CorrelationMode = 'all';
  let thresholdMode: ThresholdMode = 'global';
  let windNormalized = true;
  let trafficPollutant: 'NO2' | 'CO' | 'PM2.5' = 'NO2';
  let trafficNonhaze = false;
  let roseUniformScale = false;
  let extremeSeasonMode: 'all' | 'haze' | 'nonhaze' = 'haze';

  const controller = new AbortController();
  const root = element('div', 'drivers-dashboard analysis-dashboard');

  // --- 1. Summary Panel ---
  const summary = panel('Ringkasan Faktor Pemicu', '', 'analysis-summary');
  const threshGlobalBtn = choiceButton('Ambang Global (P95)', true);
  const threshStationBtn = choiceButton('Ambang per Stasiun (P95)', false);
  const threshGroup = choiceGroup('Mode ambang ekstrem', [threshGlobalBtn, threshStationBtn]);
  threshGroup.classList.add('summary-toolbar', 'mb-3');
  const metrics = element('div', 'metrics-grid analysis-metrics');
  summary.body.append(threshGroup, metrics);

  const empty = emptyState('Data belum mencukupi', 'Tidak ada jam pengukuran untuk cakupan pilihan.');

  // --- 2. Driver Ranking Panel (Replaces old correlation row) ---
  const rankingPanel = panel(
    'Peringkat Faktor Pemicu (PM2.5)',
    'Dekomposisi varians: η² untuk faktor kategorikal & R² untuk parameter cuaca kontinu',
  );
  const rankingHost = element('div', 'ranking-container');
  const corrDetails = element('details', 'analysis-details mt-4');
  const corrSummary = element('summary', 'cursor-pointer text-sm font-semibold text-secondary mb-2', 'Detail: Matriks Korelasi Spearman Cuaca (Agu–Okt vs Nov–Jul)');
  const corrBody = element('div', 'corr-details-body pt-2');
  const allBtn = choiceButton('Semua', true);
  const hazeBtn = choiceButton('Agu–Okt', false);
  const otherBtn = choiceButton('Nov–Jul', false);
  const corrGroup = choiceGroup('Musim pada korelasi', [allBtn, hazeBtn, otherBtn]);
  const corrHost = element('div');
  corrBody.append(corrGroup, corrHost);
  corrDetails.append(corrSummary, corrBody);

  rankingPanel.body.append(
    rankingHost,
    corrDetails,
    analysisDetails(element('p', 'panel-footnote', 'Varians dijelaskan dihitung dari rata-rata harian (≥18 jam valid per hari) untuk stasiun, tipe lokasi, musim karhutla, dan cuaca (R² linear). Faktor jam hari (η²) dihitung dari siklus diurnal 00–23 WIB. Matriks Spearman dihitung gabungan dari pasangan jam valid.')),
  );

  // --- 3. Pollution Rose Panel ---
  const rosePanel = panel('Arah Angin & Polusi', 'Komparasi arah angin pada tiga stasiun pilihan · angin ≥0,5 m/s');
  const roseControls = element('div', 'rose-controls-row flex flex-wrap items-center gap-3 mb-4');
  const select1 = element('select', 'rose-station-select filter-select');
  select1.setAttribute('aria-label', 'Pilih Stasiun 1');
  const select2 = element('select', 'rose-station-select filter-select');
  select2.setAttribute('aria-label', 'Pilih Stasiun 2');
  const select3 = element('select', 'rose-station-select filter-select');
  select3.setAttribute('aria-label', 'Pilih Stasiun 3');
  const roseScaleBtn = choiceButton('Skala Sama', false);
  roseControls.append(
    element('span', 'text-xs text-muted font-medium', 'Stasiun:'),
    select1, select2, select3,
    roseScaleBtn,
  );
  const roseHost = element('div', 'rose-small-multiples');
  rosePanel.body.append(
    roseControls,
    roseHost,
    analysisDetails(element('p', 'panel-footnote', 'Setiap sektor adalah rata-rata konsentrasi per arah datangnya angin. Sektor dengan kurang dari 5 jam pengamatan disembunyikan. Jam tenang (<0,5 m/s) tidak dihitung pada diagram polar. Aktifkan "Skala Sama" untuk menyamakan batas radius maksimum ketiga grafik.')),
  );

  // --- 4. Wind Bins by Site Type Panel ---
  const windPanel = panel('Angin & Konsentrasi Polutan', 'Dispersi polutan menurut kecepatan angin per tipe zonasi lokasi');
  const windNormBtn = choiceButton('Ternormalisasi (Rasio)', true);
  const windAbsBtn = choiceButton('Konsentrasi Absolut', false);
  const windModeGroup = choiceGroup('Skala angin', [windNormBtn, windAbsBtn]);
  windModeGroup.classList.add('mb-3');
  const windHost = element('div');
  windPanel.body.append(
    windModeGroup,
    windHost,
    analysisDetails(element('p', 'panel-footnote', 'Garis menunjukkan kecenderungan dispersi per zonasi. Mode ternormalisasi membagi konsentrasi tiap kelompok kecepatan angin terhadap median tipe lokasi tersebut (1,0 = median normal), memungkinkan perbandingan laju penurunan konsentrasi lintas baseline yang berbeda.')),
  );

  // --- 5. Traffic & Road Distance Panel ---
  const trafficPanel = panel('Lalu Lintas, Jarak Jalan & Konsentrasi', 'Sensitivitas konsentrasi gas primer terhadap volume kendaraan dan jarak ke tepi jalan');
  const no2Btn = choiceButton('NO2', true);
  const coBtn = choiceButton('CO', false);
  const pm25Btn = choiceButton('PM2.5', false);
  const trafficPolGroup = choiceGroup('Pilihan polutan lalu lintas', [no2Btn, coBtn, pm25Btn]);
  const trafficAllSeasonBtn = choiceButton('Semua Bulan', true);
  const trafficNonhazeBtn = choiceButton('Tanpa Musim Karhutla (Nov–Jul)', false);
  const trafficSeasonGroup = choiceGroup('Musim lalu lintas', [trafficAllSeasonBtn, trafficNonhazeBtn]);
  const trafficToolbar = element('div', 'flex flex-wrap items-center gap-3 mb-4');
  trafficToolbar.append(trafficPolGroup, trafficSeasonGroup);
  const trafficHost = element('div');
  trafficPanel.body.append(
    trafficToolbar,
    trafficHost,
    analysisDetails(element('p', 'panel-footnote', 'Grafik kiri menunjukkan korelasi volume kendaraan per jam terhadap konsentrasi. Grafik kanan menunjukkan efek pengenceran berdasarkan jarak stasiun ke jalan raya terdekat. Gas NO2 dan CO mencerminkan emisi langsung kendaraan lebih bersih dibanding PM2.5 yang dipengaruhi asap karhutla regional.')),
  );

  // --- 6. Extreme Conditions & Diurnal Panel ---
  const extremePanel = panel('Karakteristik & Waktu Jam Ekstrem', 'Analisis meteorologi dan probabilitas waktu terjadinya jam di atas persentil 95');
  const extremeSeasonAll = choiceButton('Semua Periode', false);
  const extremeSeasonHaze = choiceButton('Musim Karhutla (Agu–Okt)', true);
  const extremeSeasonNonhaze = choiceButton('Luar Karhutla (Nov–Jul)', false);
  const extremeSeasonGroup = choiceGroup('Musim kondisi ekstrem', [extremeSeasonHaze, extremeSeasonNonhaze, extremeSeasonAll]);
  extremeSeasonGroup.classList.add('mb-3');

  const extremeGrid = element('div', 'extreme-comparison-container grid grid-cols-1 lg:grid-cols-2 gap-5');
  const extremeLeftBox = element('div', 'extreme-table-box');
  const extremeLeftTitle = element('h4', 'text-sm font-semibold mb-2', 'Kondisi Meteorologi: Jam Ekstrem vs Jam Normal');
  const extremeTableHost = element('div', 'extreme-table-container');
  extremeLeftBox.append(extremeLeftTitle, extremeTableHost);

  const extremeRightBox = element('div', 'extreme-hour-box');
  const extremeRightTitle = element('h4', 'text-sm font-semibold mb-2', 'Probabilitas Terjadinya Jam Ekstrem per Jam Hari (WIB)');
  const extremeDiurnalHost = element('div');
  extremeRightBox.append(extremeRightTitle, extremeDiurnalHost);

  extremeGrid.append(extremeLeftBox, extremeRightBox);
  extremePanel.body.append(
    extremeSeasonGroup,
    extremeGrid,
    analysisDetails(element('p', 'panel-footnote', 'Ambang ekstrem P95 dapat dialihkan antara gabungan seluruh stasiun atau per stasiun melalui tombol di ringkasan atas. Tabel menunjukkan perubahan median kecepatan angin, kelembapan, suhu, dan jam kejadian. Grafik garis menunjukkan probabilitas jam ekstrem P(Ekstrem|Jam) per jam 00–23 WIB.')),
  );

  root.append(summary.root, empty, rankingPanel.root, rosePanel.root, windPanel.root, trafficPanel.root, extremePanel.root);
  host.replaceChildren(root);

  // Initialize Charts
  const rankingChart = createDriverRankingsChart(rankingHost);
  const correlation = createCorrelationHeatmap(corrHost);
  const windChart = createWindBinsChart(windHost, () => data.meta.pollutant);
  const trafficChart = createTrafficDualScatter(trafficHost);
  const extremeConditionView = createExtremeConditionView(extremeTableHost);
  const extremeDiurnalChart = createExtremeDiurnalChart(extremeDiurnalHost);

  let roses: Array<{ code: string; chart: ReturnType<typeof createPollutionRose> }> = [];
  let userSelectedStations: string[] = [];

  const updateCorrelation = (): void => {
    correlation.update(
      data.correlation['Pilihan']?.[corrMode] ?? {},
      'Seluruh stasiun pilihan',
      corrMode === 'all' ? 'Periode pilihan' : corrMode === 'haze' ? 'Musim Karhutla' : 'Non-Karhutla',
    );
  };

  const updateExtremeView = (): void => {
    const stats = data.extreme_modes[thresholdMode];
    extremeConditionView.update(stats.conditions, extremeSeasonMode);
    extremeDiurnalChart.update(stats.diurnal);
  };

  const updateMetrics = (): void => {
    const stats = data.extreme_modes[thresholdMode];
    const pol = data.meta.pollutant;
    const codes = Object.keys(data.pollution_rose);
    const title = summary.root.querySelector('.panel-header p');
    if (title) {
      title.textContent = `${pol} · ${data.meta.date_range.start ? period(data.meta.date_range.start, data.meta.date_range.end) : 'Tidak ada tanggal pilihan'}`;
    }
    const format = (value: number | null): string => (value === null ? '—' : number(value));
    const isGlobal = thresholdMode === 'global';
    metrics.replaceChildren(
      metric(
        'Jam Ekstrem Karhutla',
        stats.haze_season_share === null ? '—' : `${number(stats.haze_season_share * 100)}%`,
        'Agu–Okt',
        isGlobal ? 'Dari jam >P95 gabungan seluruh stasiun' : 'Dari jam >P95 dihitung per stasiun',
      ),
      metric(
        'Angin saat Ekstrem',
        format(stats.extreme.median_wind_speed),
        'm/s',
        `Jam normal: ${format(stats.normal.median_wind_speed)} m/s (${isGlobal ? 'Global' : 'Per Stasiun'})`,
      ),
      metric(
        'Ambang Ekstrem P95',
        stats.threshold_label,
        '',
        isGlobal ? `Persentil 95 ${pol} gabungan pilihan` : `Baku ekstrem lokal spesifik per stasiun`,
      ),
      metric(
        'Stasiun Pilihan',
        number(codes.length),
        'stasiun AQMS',
        'Mengikuti filter wilayah dan tipe zonasi',
      ),
    );
  };

  const updateRoses = (): void => {
    const pol = data.meta.pollutant;
    const codes = Object.keys(data.pollution_rose);
    if (!codes.length) {
      for (const item of roses) item.chart.destroy();
      roses = [];
      return;
    }

    // Default to 3 highest mean stations if user hasn't explicitly customized or invalid
    const sortedByMean = [...codes].sort((a, b) => {
      const mA = data.pollution_rose_meta[a]?.meanConcentration ?? 0;
      const mB = data.pollution_rose_meta[b]?.meanConcentration ?? 0;
      return mB - mA;
    });

    if (userSelectedStations.length !== 3 || !userSelectedStations.every(c => codes.includes(c))) {
      userSelectedStations = sortedByMean.slice(0, 3);
      while (userSelectedStations.length < 3 && sortedByMean[0]) {
        userSelectedStations.push(sortedByMean[0]);
      }
    }

    // Populate selects
    const updateSelect = (sel: HTMLSelectElement, selectedVal: string) => {
      sel.innerHTML = '';
      for (const code of sortedByMean) {
        const opt = document.createElement('option');
        opt.value = code;
        const info = data.pollution_rose_meta[code];
        const meanText = info?.meanConcentration !== null && info?.meanConcentration !== undefined
          ? ` (${info.meanConcentration.toFixed(1)} µg/m³)`
          : '';
        opt.textContent = `${code} - ${info?.name ?? ''}${meanText}`;
        if (code === selectedVal) opt.selected = true;
        sel.append(opt);
      }
    };
    updateSelect(select1, userSelectedStations[0] ?? '');
    updateSelect(select2, userSelectedStations[1] ?? '');
    updateSelect(select3, userSelectedStations[2] ?? '');

    // Max scale across the 3 selected stations
    let maxScale: number | null = null;
    if (roseUniformScale) {
      let maxVal = 0;
      for (const c of userSelectedStations) {
        const sectors = data.pollution_rose[c] ?? [];
        for (const s of sectors) {
          if (s.mean_concentration !== null && s.mean_concentration > maxVal) {
            maxVal = s.mean_concentration;
          }
        }
      }
      if (maxVal > 0) maxScale = Math.ceil(maxVal * 1.1);
    }

    const currentKey = userSelectedStations.join();
    const rosesKey = roses.map(r => r.code).join();
    if (currentKey !== rosesKey) {
      for (const item of roses) item.chart.destroy();
      roses = userSelectedStations.map(code => ({
        code,
        chart: createPollutionRose(roseHost, code, () => pol),
      }));
    }

    roses.forEach(item => {
      const code = item.code;
      const sectors = data.pollution_rose[code] ?? [];
      const info = data.pollution_rose_meta[code];
      item.chart.update(sectors, info?.name, info?.totalValidHours, maxScale);
    });
  };

  // Event Listeners
  threshGlobalBtn.addEventListener('click', () => {
    thresholdMode = 'global';
    setSelected(threshGlobalBtn, true);
    setSelected(threshStationBtn, false);
    updateMetrics();
    updateExtremeView();
  }, { signal: controller.signal });

  threshStationBtn.addEventListener('click', () => {
    thresholdMode = 'station';
    setSelected(threshGlobalBtn, false);
    setSelected(threshStationBtn, true);
    updateMetrics();
    updateExtremeView();
  }, { signal: controller.signal });

  for (const [btn, val] of [[allBtn, 'all'], [hazeBtn, 'haze'], [otherBtn, 'nonhaze']] satisfies [HTMLButtonElement, CorrelationMode][]) {
    btn.addEventListener('click', () => {
      corrMode = val;
      setSelected(allBtn, corrMode === 'all');
      setSelected(hazeBtn, corrMode === 'haze');
      setSelected(otherBtn, corrMode === 'nonhaze');
      updateCorrelation();
    }, { signal: controller.signal });
  }

  const onSelectRose = (idx: number, sel: HTMLSelectElement) => {
    userSelectedStations[idx] = sel.value;
    updateRoses();
  };
  select1.addEventListener('change', () => onSelectRose(0, select1), { signal: controller.signal });
  select2.addEventListener('change', () => onSelectRose(1, select2), { signal: controller.signal });
  select3.addEventListener('change', () => onSelectRose(2, select3), { signal: controller.signal });

  roseScaleBtn.addEventListener('click', () => {
    roseUniformScale = !roseUniformScale;
    setSelected(roseScaleBtn, roseUniformScale);
    updateRoses();
  }, { signal: controller.signal });

  windNormBtn.addEventListener('click', () => {
    windNormalized = true;
    setSelected(windNormBtn, true);
    setSelected(windAbsBtn, false);
    windChart.update(data.wind_by_site_type, windNormalized);
  }, { signal: controller.signal });

  windAbsBtn.addEventListener('click', () => {
    windNormalized = false;
    setSelected(windNormBtn, false);
    setSelected(windAbsBtn, true);
    windChart.update(data.wind_by_site_type, windNormalized);
  }, { signal: controller.signal });

  const setTrafficPol = (p: 'NO2' | 'CO' | 'PM2.5') => {
    trafficPollutant = p;
    setSelected(no2Btn, p === 'NO2');
    setSelected(coBtn, p === 'CO');
    setSelected(pm25Btn, p === 'PM2.5');
    trafficChart.update(getTrafficScatterPoints(data, trafficPollutant, trafficNonhaze), trafficPollutant, trafficNonhaze);
  };
  no2Btn.addEventListener('click', () => setTrafficPol('NO2'), { signal: controller.signal });
  coBtn.addEventListener('click', () => setTrafficPol('CO'), { signal: controller.signal });
  pm25Btn.addEventListener('click', () => setTrafficPol('PM2.5'), { signal: controller.signal });

  trafficAllSeasonBtn.addEventListener('click', () => {
    trafficNonhaze = false;
    setSelected(trafficAllSeasonBtn, true);
    setSelected(trafficNonhazeBtn, false);
    trafficChart.update(getTrafficScatterPoints(data, trafficPollutant, trafficNonhaze), trafficPollutant, trafficNonhaze);
  }, { signal: controller.signal });

  trafficNonhazeBtn.addEventListener('click', () => {
    trafficNonhaze = true;
    setSelected(trafficAllSeasonBtn, false);
    setSelected(trafficNonhazeBtn, true);
    trafficChart.update(getTrafficScatterPoints(data, trafficPollutant, trafficNonhaze), trafficPollutant, trafficNonhaze);
  }, { signal: controller.signal });

  for (const [btn, val] of [
    [extremeSeasonHaze, 'haze'],
    [extremeSeasonNonhaze, 'nonhaze'],
    [extremeSeasonAll, 'all'],
  ] satisfies [HTMLButtonElement, 'all' | 'haze' | 'nonhaze'][]) {
    btn.addEventListener('click', () => {
      extremeSeasonMode = val;
      setSelected(extremeSeasonHaze, val === 'haze');
      setSelected(extremeSeasonNonhaze, val === 'nonhaze');
      setSelected(extremeSeasonAll, val === 'all');
      updateExtremeView();
    }, { signal: controller.signal });
  }

  const update = (next: DriversData): void => {
    data = next;
    const available = data.extreme_modes.global.threshold !== null;
    empty.hidden = available;
    for (const p of [rankingPanel.root, rosePanel.root, windPanel.root, trafficPanel.root, extremePanel.root]) {
      p.hidden = !available;
    }

    updateMetrics();
    rankingChart.update(data.driver_rankings);
    updateCorrelation();
    updateRoses();
    windChart.update(data.wind_by_site_type, windNormalized);
    trafficChart.update(getTrafficScatterPoints(data, trafficPollutant, trafficNonhaze), trafficPollutant, trafficNonhaze);
    updateExtremeView();

    root.dataset['pollutant'] = data.meta.pollutant;
  };

  update(initial);

  return {
    update,
    destroy: () => {
      controller.abort();
      for (const item of roses) item.chart.destroy();
      rankingChart.destroy();
      correlation.destroy();
      windChart.destroy();
      trafficChart.destroy();
      extremeConditionView.destroy();
      extremeDiurnalChart.destroy();
      root.remove();
    },
  };
}
