import { seriesLegend } from '../../shared/series-legend';
import type { PollutantName } from '../../data/types';
import {
  ArcElement,
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  Filler,
  Legend,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  PolarAreaController,
  RadialLinearScale,
  ScatterController,
  Tooltip,
} from 'chart.js';
import { chartTheme, manageChart } from '../../shared/chart-lifecycle';
import { manageCanvas } from '../../shared/canvas-lifecycle';
import { matrixLegend, matrixSurface } from '../../shared/matrix-surface';
import { analysisDetails, setSelected } from '../../shared/analysis-controls';
import { element } from '../../shared/dom';
import { number } from '../../shared/format';
import type {
  CorrelationMatrix,
  DirectionSector,
  DriverRankingItem,
  ExtremeDiurnalHourly,
  ExtremeStatsByThresholdMode,
  WindSiteTypeData,
} from './types';
import { computeLinearTrend, type TrafficPoint } from './model';

Chart.register(
  ArcElement,
  BarController,
  BarElement,
  CategoryScale,
  Filler,
  Legend,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  PolarAreaController,
  RadialLinearScale,
  ScatterController,
  Tooltip,
);

const SECTORS_ORDER = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];

export const SITE_TYPE_COLORS: Record<string, string> = {
  'Traffic / Roadside': '#ef4444',
  'Urban Background': '#0284c7',
  'Urban Coastal Background': '#0d9488',
  'Regional / Clean Background': '#16a34a',
  'Peatland Boundary': '#ea580c',
  'Industrial Perimeter': '#8b5cf6',
};

// --- 1. Pollution Rose ---
export function createPollutionRose(host: HTMLElement, stationCode: string, pollutant: () => PollutantName): {
  update: (sectors: readonly DirectionSector[], stationName?: string, nHours?: number, scaleMax?: number | null) => void;
  setScaleMax: (max: number | null) => void;
  destroy: () => void;
} {
  const card = element('div', 'rose-card');
  const heading = element('h4', 'rose-title', stationCode);
  const subtitle = element('p', 'rose-subtitle text-xs text-muted', '');
  const frame = element('div', 'rose-plot analysis-plot');
  const canvas = element('canvas');
  canvas.setAttribute('role', 'img');
  canvas.dataset['chart'] = 'pollution-rose';

  frame.append(canvas);
  card.append(heading, subtitle, frame);
  host.append(card);

  let currentSectors: readonly DirectionSector[] = [];

  const chart = new Chart<'polarArea', (number | null)[], string>(canvas, {
    type: 'polarArea',
    data: {
      labels: SECTORS_ORDER,
      datasets: [{
        data: SECTORS_ORDER.map(() => 0),
        backgroundColor: 'rgba(13, 148, 136, 0.6)',
        borderColor: '#0f766e',
        borderWidth: 1,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: matchMedia('(prefers-reduced-motion: reduce)').matches ? false : { duration: 500 },
      plugins: {
        legend: { display: false },
        tooltip: {
          displayColors: false,
          callbacks: {
            title: items => `Arah Angin: ${items[0]?.label ?? ''}`,
            label: item => {
              const sec = currentSectors.find(s => s.direction_label === item.label);
              if (!sec || sec.mean_concentration === null) return 'Sektor disembunyikan (jam tidak mencukupi atau angin <0.5 m/s)';
              return `Rerata ${pollutant()}: ${number(sec.mean_concentration)} µg/m³ (n = ${number(sec.count)} jam)`;
            },
          },
        },
      },
      scales: {
        r: {
          beginAtZero: true,
          ticks: {
            display: true,
            backdropColor: 'transparent',
            font: { size: 11 },
            maxTicksLimit: 4,
          },
          grid: { color: 'rgba(148, 163, 184, 0.2)' },
          angleLines: { color: 'rgba(148, 163, 184, 0.2)' },
          pointLabels: {
            display: true,
            centerPointLabels: true,
            font: { size: 11, weight: 600 },
          },
        },
      },
    },
  });

  const applyColors = (): void => {
    const theme = chartTheme();
    if (chart.options.scales?.['r']?.ticks) chart.options.scales['r'].ticks.color = theme.text;
    if (chart.options.scales?.['r']?.pointLabels) chart.options.scales['r'].pointLabels.color = theme.text;
  };

  const lifecycle = manageChart(chart, applyColors);

  const setScaleMax = (max: number | null): void => {
    const rScale = chart.options.scales?.['r'];
    if (rScale) {
      if (max !== null && max > 0) rScale.max = max;
      else delete rScale.max;
      lifecycle.refresh();
    }
  };

  return {
    update: (sectors, stationName, nHours, scaleMax) => {
      canvas.setAttribute('aria-label', `Mawar polusi ${pollutant()} · ${stationCode}`);
      currentSectors = sectors;
      if (stationName || nHours !== undefined) {
        subtitle.textContent = stationName
          ? (nHours !== undefined ? `${stationName} · ${number(nHours)} jam observasi angin ≥0,5 m/s` : stationName)
          : (nHours !== undefined ? `${number(nHours)} jam observasi angin ≥0,5 m/s` : '');
      }
      const sectorMap = new Map<string, DirectionSector>();
      sectors.forEach(s => sectorMap.set(s.direction_label, s));

      const values = SECTORS_ORDER.map(dir => {
        const sec = sectorMap.get(dir);
        return sec && sec.count >= 5 ? sec.mean_concentration : null;
      });

      const dataset = chart.data.datasets[0];
      if (dataset) {
        dataset.data = values;
        dataset.backgroundColor = 'rgba(13, 148, 136, 0.65)';
      }
      if (scaleMax !== undefined) {
        const rScale = chart.options.scales?.['r'];
        if (rScale) {
          if (scaleMax !== null && scaleMax > 0) rScale.max = scaleMax;
          else delete rScale.max;
        }
      }
      applyColors();
      lifecycle.refresh();
    },
    setScaleMax,
    destroy: () => {
      lifecycle.destroy();
      card.remove();
    },
  };
}

// --- 2. Driver Ranking Chart ---
export function createDriverRankingsChart(host: HTMLElement): {
  update: (items: readonly DriverRankingItem[]) => void;
  destroy: () => void;
} {
  const frame = element('div', 'driver-rankings-plot analysis-plot');
  const canvas = element('canvas');
  canvas.setAttribute('role', 'img');
  canvas.dataset['chart'] = 'driver-rankings';
  frame.append(canvas);
  host.append(frame);

  let currentItems: readonly DriverRankingItem[] = [];

  const chart = new Chart<'bar', number[], string>(canvas, {
    type: 'bar',
    data: { labels: [], datasets: [] },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      animation: matchMedia('(prefers-reduced-motion: reduce)').matches ? false : { duration: 600 },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            title: items => items[0]?.label ?? '',
            label: item => {
              const driver = currentItems[item.dataIndex];
              if (!driver) return '';
              const pct = (driver.varianceExplained * 100).toFixed(1);
              const rText = driver.r !== undefined ? `, r = ${driver.r > 0 ? '+' : ''}${driver.r.toFixed(2)}` : '';
              return [
                `Kontribusi Varians: ${pct}% (${driver.metricName} = ${driver.varianceExplained.toFixed(3)}${rText})`,
                `Keterangan: ${driver.interpretation}`,
              ];
            },
          },
        },
      },
      scales: {
        x: {
          beginAtZero: true,
          max: 40,
          title: { display: true, text: 'Proporsi Varians PM2.5 Dijelaskan (%)' },
          ticks: {
            callback: value => `${value}%`,
            maxTicksLimit: 6,
          },
        },
        y: {
          grid: { display: false },
          ticks: { font: { size: 12, weight: 600 } },
        },
      },
    },
  });

  const applyColors = (): void => {
    const theme = chartTheme();
    if (chart.options.scales?.['x']?.ticks) chart.options.scales['x'].ticks.color = theme.text;
    if (chart.options.scales?.['x']?.title) chart.options.scales['x'].title.color = theme.text;
    if (chart.options.scales?.['x']?.grid) chart.options.scales['x'].grid.color = theme.grid;
    if (chart.options.scales?.['y']?.ticks) chart.options.scales['y'].ticks.color = theme.text;
  };

  const lifecycle = manageChart(chart, applyColors);

  return {
    update: items => {
      currentItems = items;
      canvas.setAttribute('aria-label', `Peringkat faktor pemicu PM2.5 berdasarkan varians yang dijelaskan.`);
      const labels = items.map(item => `${item.label} (${item.metricName})`);
      const data = items.map(item => Number((item.varianceExplained * 100).toFixed(1)));
      const bgColors = items.map(item => item.factorType === 'categorical' ? 'rgba(217, 119, 6, 0.85)' : 'rgba(13, 148, 136, 0.85)');

      chart.data.labels = labels;
      chart.data.datasets = [{
        label: 'Varians Dijelaskan (%)',
        data,
        backgroundColor: bgColors,
        borderRadius: 4,
      }];

      const maxVal = Math.max(...data, 20);
      if (chart.options.scales?.['x']) chart.options.scales['x'].max = Math.ceil(maxVal * 1.15 / 5) * 5;

      applyColors();
      lifecycle.refresh();
    },
    destroy: () => {
      lifecycle.destroy();
      frame.remove();
    },
  };
}

// --- 3. Correlation Heatmap ---
export function createCorrelationHeatmap(host: HTMLElement): {
  update: (matrix: CorrelationMatrix, stationName: string, modeName: string) => void;
  destroy: () => void;
} {
  const surface = matrixSurface(host, 'Matriks korelasi Spearman polutan dan parameter cuaca');
  surface.root.classList.add('correlation-matrix');
  const { canvas, viewport } = surface;
  const controller = new AbortController();
  let pollutants: string[] = [], labels: string[] = [];
  const weather: readonly ('temperature_c' | 'humidity_pct' | 'wind_speed_ms')[] = ['temperature_c', 'humidity_pct', 'wind_speed_ms'];
  const headers = [['Suhu', '(°C)'], ['Lembap', '(%)'], ['Angin', '(m/s)']];
  const left = 56, top = 44, cellHeight = 38;
  const cellWidth = (): number => Math.max(60, Math.floor((viewport.clientWidth - left - 8) / 3));
  let currentMatrix: CorrelationMatrix = {}, currentStation = '', currentMode = '';
  matrixLegend(surface.legend, 'Spearman (r)', [['−1 · negatif', '#1e40af'], ['0 · netral', '#cbd5e1'], ['+1 · positif', '#dc2626']]);

  function cellColors(value: number | null): { fill: string; text: string } {
    const theme = chartTheme();
    if (value === null) return { fill: theme.grid, text: theme.text };
    const intensity = Math.min(1, Math.abs(value));
    const end = value < 0 ? [30, 64, 175] : [220, 38, 38];
    const rgb = end.map(channel => Math.round(255 - intensity * (255 - channel)));
    const linear = rgb.map(channel => { const v = channel / 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; });
    const luminance = .2126 * (linear[0] ?? 0) + .7152 * (linear[1] ?? 0) + .0722 * (linear[2] ?? 0);
    return { fill: `rgb(${rgb.join(',')})`, text: 1.05 / (luminance + .05) > (luminance + .05) / .05 ? '#ffffff' : '#000000' };
  }

  function render(): void {
    const width = cellWidth(), ctx = surface.size(left + 3 * width + 8, top + Math.max(1, pollutants.length) * cellHeight + 8);
    if (!ctx) return;
    const theme = chartTheme();
    ctx.font = '12px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = theme.text;
    headers.forEach((lines, column) => lines.forEach((line, row) => ctx.fillText(line, left + column * width + width / 2, 12 + row * 15)));
    pollutants.forEach((pollutant, row) => {
      ctx.fillStyle = theme.text;
      ctx.textAlign = 'right';
      ctx.fillText(labels[row] ?? pollutant, left - 8, top + row * cellHeight + cellHeight / 2);
      weather.forEach((parameter, column) => {
        const value = currentMatrix[pollutant]?.[parameter] ?? null, colors = cellColors(value);
        ctx.fillStyle = colors.fill;
        ctx.fillRect(left + column * width + 2, top + row * cellHeight + 2, width - 4, cellHeight - 4);
        ctx.fillStyle = colors.text;
        ctx.textAlign = 'center';
        ctx.fillText(value === null ? '—' : `${value > 0 ? '+' : ''}${value.toFixed(2)}`, left + column * width + width / 2, top + row * cellHeight + cellHeight / 2);
      });
    });
  }

  const show = (event: PointerEvent): void => {
    const bounds = canvas.getBoundingClientRect();
    const column = Math.floor((event.clientX - bounds.left - left) / cellWidth()), row = Math.floor((event.clientY - bounds.top - top) / cellHeight);
    const pollutant = pollutants[row], parameter = weather[column];
    if (!pollutant || !parameter || row < 0 || column < 0) { surface.hide(); return; }
    const value = currentMatrix[pollutant]?.[parameter] ?? null;
    surface.show(event, `${labels[row]} × ${headers[column]?.join(' ')}\n${currentStation} · ${currentMode}\nSpearman r: ${value === null ? 'Tidak tersedia' : value.toFixed(3)}`);
  };

  canvas.addEventListener('pointermove', show, { signal: controller.signal });
  canvas.addEventListener('pointerdown', show, { signal: controller.signal });
  canvas.addEventListener('pointerleave', surface.hide, { signal: controller.signal });
  const lifecycle = manageCanvas(viewport, render);

  return {
    update(matrix, stationName, modeName): void {
      currentMatrix = matrix; currentStation = stationName; currentMode = modeName;
      pollutants = Object.keys(matrix);
      labels = [...pollutants];
      canvas.setAttribute('aria-label', `Korelasi polutan dan cuaca di ${stationName}, ${modeName}`);
      surface.alternative.textContent = pollutants.flatMap((pollutant, row) => weather.map((parameter, column) => {
        const value = matrix[pollutant]?.[parameter] ?? null;
        return `${labels[row]} × ${headers[column]?.join(' ')}: ${value === null ? 'tidak tersedia' : value.toFixed(3)}`;
      })).join('; ');
      render();
    },
    destroy(): void { controller.abort(); lifecycle.destroy(); surface.destroy(); },
  };
}

// --- 4. Wind Bins by Site Type (Normalized Slopes) ---
export function createWindBinsChart(host: HTMLElement, pollutant: () => PollutantName): {
  update: (data: Record<string, WindSiteTypeData>, normalized: boolean) => void;
  destroy: () => void;
} {
  const frame = element('div', 'wind-bins-plot analysis-plot');
  const canvas = element('canvas');
  canvas.setAttribute('role', 'img');
  canvas.dataset['chart'] = 'wind-bins';
  frame.append(canvas);
  host.append(frame);

  const binLabels = ['0–0.5', '0.5–1', '1–2', '2–3', '3–5', '5+'];
  let currentNormalized = true;
  let currentData: Record<string, WindSiteTypeData> = {};

  const chart = new Chart<'line', (number | null)[], string>(canvas, {
    type: 'line',
    data: { labels: binLabels, datasets: [] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: matchMedia('(prefers-reduced-motion: reduce)').matches ? false : { duration: 600 },
      interaction: { intersect: false, mode: 'index' },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            title: items => `Kecepatan Angin: ${items[0]?.label ?? ''} m/s`,
            label: item => {
              const st = item.dataset.label ?? '';
              const stData = currentData[st];
              const bin = stData?.bins.find(b => b.label === item.label);
              if (!bin || bin.median_concentration === null) return `${st}: Tidak cukup jam pengamatan`;
              const conc = `${number(bin.median_concentration)} µg/m³`;
              const ratio = bin.normalized_ratio !== null ? `${bin.normalized_ratio.toFixed(2)}× median` : '—';
              return `${st}: ${currentNormalized ? ratio + ' (' + conc + ')' : conc} · n = ${number(bin.count)} jam`;
            },
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          title: { display: true, text: 'Kecepatan Angin (m/s)' },
        },
        y: {
          beginAtZero: true,
          title: { display: true, text: 'Rasio terhadap Median Zonasi (1.0 = Median)' },
          ticks: { maxTicksLimit: 6 },
        },
      },
    },
  });

  const applyColors = (): void => {
    const theme = chartTheme();
    if (chart.options.scales?.['x']?.ticks) chart.options.scales['x'].ticks.color = theme.text;
    if (chart.options.scales?.['x']?.title) chart.options.scales['x'].title.color = theme.text;
    if (chart.options.scales?.['y']?.ticks) chart.options.scales['y'].ticks.color = theme.text;
    if (chart.options.scales?.['y']?.grid) chart.options.scales['y'].grid.color = theme.grid;
    if (chart.options.scales?.['y']?.title) chart.options.scales['y'].title.color = theme.text;
  };

  const lifecycle = manageChart(chart, applyColors);
  const legend = seriesLegend(host, index => {
    const visible = !chart.isDatasetVisible(index);
    chart.setDatasetVisibility(index, visible);
    lifecycle.refresh();
    return visible;
  });

  return {
    update: (data, normalized) => {
      currentData = data;
      currentNormalized = normalized;
      const yTitle = normalized ? 'Rasio terhadap Median Zonasi (1.0 = Normal)' : `Median ${pollutant()} (µg/m³)`;
      if (chart.options.scales?.['y']?.title) chart.options.scales['y'].title.text = yTitle;

      const datasets = Object.entries(data).map(([siteType, info]) => {
        const color = SITE_TYPE_COLORS[siteType] ?? '#0284c7';
        const points = binLabels.map(lbl => {
          const b = info.bins.find(item => item.label === lbl);
          if (!b || b.count < 5) return null;
          return normalized ? b.normalized_ratio : b.median_concentration;
        });
        return {
          label: siteType,
          data: points,
          borderColor: color,
          backgroundColor: color,
          borderWidth: 2.5,
          pointRadius: 4.5,
          tension: 0.15,
        };
      });

      chart.data.datasets = datasets;
      legend.update(datasets.map((dataset, index) => ({
        label: dataset.label,
        color: typeof dataset.borderColor === 'string' ? dataset.borderColor : '#0284c7',
        visible: chart.isDatasetVisible(index),
      })));
      applyColors();
      lifecycle.refresh();
    },
    destroy: () => {
      legend.destroy();
      lifecycle.destroy();
      frame.remove();
    },
  };
}

// --- 5. Traffic & Road Distance Dual Scatter ---
export function createTrafficDualScatter(host: HTMLElement): {
  update: (points: readonly TrafficPoint[], pollutant: 'NO2' | 'CO' | 'PM2.5', nonhazeOnly: boolean) => void;
  destroy: () => void;
} {
  const container = element('div', 'traffic-scatter-grid');
  const frameTraffic = element('div', 'analysis-plot traffic-box');
  const titleTraffic = element('h4', 'text-sm font-semibold mb-2', 'Konsentrasi vs Intensitas Lalu Lintas');
  const canvasTraffic = element('canvas');
  canvasTraffic.setAttribute('role', 'img');
  frameTraffic.append(titleTraffic, canvasTraffic);

  const frameRoad = element('div', 'analysis-plot road-box');
  const titleRoad = element('h4', 'text-sm font-semibold mb-2', 'Konsentrasi vs Jarak ke Jalan');
  const canvasRoad = element('canvas');
  canvasRoad.setAttribute('role', 'img');
  frameRoad.append(titleRoad, canvasRoad);

  container.append(frameTraffic, frameRoad);
  const legendHost = element('div', 'analysis-legend analysis-chart-legend mt-2');
  const legendDetails = analysisDetails(legendHost, 'Legenda tipe lokasi');
  host.append(container, legendDetails);

  const controller = new AbortController();

  const makeScatterChart = (canvas: HTMLCanvasElement, xTitle: string) =>
    new Chart<'scatter', Array<{ x: number; y: number }>, string>(canvas, {
      type: 'scatter',
      data: { datasets: [] },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: matchMedia('(prefers-reduced-motion: reduce)').matches ? false : { duration: 600 },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: item => {
                const pt = (item.raw as { x: number; y: number; station?: string; siteType?: string });
                const xVal = item.parsed.x !== null ? number(item.parsed.x) : '—';
                const yVal = item.parsed.y !== null ? number(item.parsed.y) : '—';
                return `${pt.station ?? ''} (${pt.siteType ?? ''}): x=${xVal} → y=${yVal} µg/m³`;
              },
            },
          },
        },
        scales: {
          x: { beginAtZero: true, title: { display: true, text: xTitle } },
          y: { beginAtZero: true, title: { display: true, text: 'Rerata Konsentrasi (µg/m³)' }, ticks: { maxTicksLimit: 6 } },
        },
      },
    });

  const chartTraffic = makeScatterChart(canvasTraffic, 'Lalu lintas (kendaraan/jam)');
  const chartRoad = makeScatterChart(canvasRoad, 'Jarak ke jalan (meter)');

  const applyColors = (): void => {
    const theme = chartTheme();
    [chartTraffic, chartRoad].forEach(c => {
      if (c.options.scales?.['x']?.ticks) c.options.scales['x'].ticks.color = theme.text;
      if (c.options.scales?.['x']?.title) c.options.scales['x'].title.color = theme.text;
      if (c.options.scales?.['x']?.grid) c.options.scales['x'].grid.color = theme.grid;
      if (c.options.scales?.['y']?.ticks) c.options.scales['y'].ticks.color = theme.text;
      if (c.options.scales?.['y']?.grid) c.options.scales['y'].grid.color = theme.grid;
      if (c.options.scales?.['y']?.title) c.options.scales['y'].title.color = theme.text;
    });
  };

  const lifeTraffic = manageChart(chartTraffic, applyColors);
  const lifeRoad = manageChart(chartRoad, applyColors);

  return {
    update: (points, pollutant, nonhazeOnly) => {
      const validPoints = points.filter(p => p.concentration !== null);
      const yTitle = `Rerata ${pollutant} (µg/m³)${nonhazeOnly ? ' [Nov–Jul]' : ''}`;
      if (chartTraffic.options.scales?.['y']?.title) chartTraffic.options.scales['y'].title.text = yTitle;
      if (chartRoad.options.scales?.['y']?.title) chartRoad.options.scales['y'].title.text = yTitle;

      // Group by siteType
      const groups = new Map<string, TrafficPoint[]>();
      validPoints.forEach(p => {
        const list = groups.get(p.siteType) ?? [];
        list.push(p);
        groups.set(p.siteType, list);
      });

      // 1. Traffic Scatter
      const trafficPoints = validPoints.map(p => ({ x: p.traffic, y: p.concentration as number, station: p.station, siteType: p.siteType }));
      const trafficTrend = computeLinearTrend(trafficPoints);
      titleTraffic.textContent = `Konsentrasi vs Lalu Lintas (${trafficTrend.r !== null ? `r = ${trafficTrend.r > 0 ? '+' : ''}${trafficTrend.r.toFixed(2)}, ` : ''}n = ${trafficTrend.n} stasiun)`;

      interface ScatterItemDataset {
        type?: 'scatter' | 'line';
        label: string;
        data: Array<{ x: number; y: number }>;
        backgroundColor?: string;
        borderColor?: string;
        pointRadius?: number;
        pointHoverRadius?: number;
        borderWidth?: number;
        borderDash?: number[];
      }

      const datasetsTraffic: ScatterItemDataset[] = Array.from(groups.entries()).map(([st, pts]) => ({
        label: st,
        data: pts.map(p => ({ x: p.traffic, y: p.concentration as number })),
        backgroundColor: SITE_TYPE_COLORS[st] ?? '#64748b',
        borderColor: SITE_TYPE_COLORS[st] ?? '#64748b',
        pointRadius: 6,
        pointHoverRadius: 8,
      }));

      if (trafficTrend.line.length === 2) {
        datasetsTraffic.push({
          type: 'line',
          label: `Garis Tren (r = ${trafficTrend.r?.toFixed(2)})`,
          data: trafficTrend.line,
          borderColor: '#475569',
          borderWidth: 2,
          borderDash: [5, 5],
          pointRadius: 0,
        });
      }
      chartTraffic.data.datasets = datasetsTraffic as unknown as typeof chartTraffic.data.datasets;

      // 2. Road Distance Scatter
      const roadPoints = validPoints.map(p => ({ x: p.roadDistance, y: p.concentration as number, station: p.station, siteType: p.siteType }));
      const roadTrend = computeLinearTrend(roadPoints);
      titleRoad.textContent = `Konsentrasi vs Jarak Jalan (${roadTrend.r !== null ? `r = ${roadTrend.r > 0 ? '+' : ''}${roadTrend.r.toFixed(2)}, ` : ''}n = ${roadTrend.n} stasiun)`;

      const datasetsRoad: ScatterItemDataset[] = Array.from(groups.entries()).map(([st, pts]) => ({
        label: st,
        data: pts.map(p => ({ x: p.roadDistance, y: p.concentration as number })),
        backgroundColor: SITE_TYPE_COLORS[st] ?? '#64748b',
        borderColor: SITE_TYPE_COLORS[st] ?? '#64748b',
        pointRadius: 6,
        pointHoverRadius: 8,
      }));

      if (roadTrend.line.length === 2) {
        datasetsRoad.push({
          type: 'line',
          label: `Garis Tren (r = ${roadTrend.r?.toFixed(2)})`,
          data: roadTrend.line,
          borderColor: '#475569',
          borderWidth: 2,
          borderDash: [5, 5],
          pointRadius: 0,
        });
      }
      chartRoad.data.datasets = datasetsRoad as unknown as typeof chartRoad.data.datasets;

      // Update legend buttons
      legendHost.replaceChildren(...Array.from(groups.keys()).map((st, idx) => {
        const btn = element('button');
        btn.type = 'button';
        btn.dataset['dataset'] = String(idx);
        setSelected(btn, true);
        const swatch = element('i', 'swatch');
        swatch.style.backgroundColor = SITE_TYPE_COLORS[st] ?? '#64748b';
        swatch.setAttribute('aria-hidden', 'true');
        btn.append(swatch, document.createTextNode(st));
        btn.addEventListener('click', () => {
          const visible = !chartTraffic.isDatasetVisible(idx);
          chartTraffic.setDatasetVisibility(idx, visible);
          chartRoad.setDatasetVisibility(idx, visible);
          setSelected(btn, visible);
          lifeTraffic.refresh();
          lifeRoad.refresh();
        }, { signal: controller.signal });
        return btn;
      }));

      applyColors();
      lifeTraffic.refresh();
      lifeRoad.refresh();
    },
    destroy: () => {
      controller.abort();
      legendDetails.remove();
      lifeTraffic.destroy();
      lifeRoad.destroy();
      container.remove();
    },
  };
}

// --- 6. Extreme Conditions Comparison Table ---
export function createExtremeConditionView(host: HTMLElement): {
  update: (conditions: ExtremeStatsByThresholdMode['conditions'], mode: 'all' | 'haze' | 'nonhaze') => void;
  destroy: () => void;
} {
  const container = element('div', 'extreme-condition-view');
  const table = element('table', 'data-table extreme-table');
  table.setAttribute('aria-label', 'Perbandingan parameter meteorologi saat jam ekstrem versus normal');

  const thead = element('thead');
  thead.innerHTML = `
    <tr>
      <th scope="col">Parameter</th>
      <th scope="col" class="text-right">Jam Ekstrem (&gt;P95)</th>
      <th scope="col" class="text-right">Jam Normal (≤P95)</th>
      <th scope="col" class="text-right">Selisih (Δ)</th>
      <th scope="col">Indikasi Fisik</th>
    </tr>
  `;

  const tbody = element('tbody');
  table.append(thead, tbody);
  container.append(table);
  host.append(container);

  return {
    update: (conditions, mode) => {
      const comp = conditions[mode];
      const ext = comp.extreme;
      const norm = comp.normal;

      const formatVal = (v: number | null, unit: string) => v !== null ? `${v.toFixed(1)} ${unit}` : '—';
      const deltaVal = (e: number | null, n: number | null, unit: string) => {
        if (e === null || n === null) return '—';
        const d = e - n;
        const sign = d > 0 ? '+' : '';
        const color = Math.abs(d) < 0.05 ? '' : d > 0 ? 'text-amber-600 font-semibold' : 'text-blue-600 font-semibold';
        return `<span class="${color}">${sign}${d.toFixed(1)} ${unit}</span>`;
      };

      const rows = [
        {
          label: 'Kecepatan Angin',
          unit: 'm/s',
          ext: ext.median_wind_speed,
          norm: norm.median_wind_speed,
          note: ext.median_wind_speed !== null && norm.median_wind_speed !== null && ext.median_wind_speed < norm.median_wind_speed
            ? 'Stagnasi atmosfer: kecepatan angin melemah saat polusi memuncak'
            : 'Ventilasi udara',
        },
        {
          label: 'Kelembapan Relatif',
          unit: '%',
          ext: ext.median_humidity,
          norm: norm.median_humidity,
          note: mode === 'nonhaze'
            ? 'Pertumbuhan higroskopis partikel dan pembentukan kabut basah'
            : 'Kondisi kelembapan udara saat akumulasi polutan',
        },
        {
          label: 'Suhu Udara',
          unit: '°C',
          ext: ext.median_temperature,
          norm: norm.median_temperature,
          note: 'Inversi permukaan dan kestabilan lapisan batas',
        },
        {
          label: 'Median Jam Kejadian',
          unit: 'WIB',
          ext: ext.median_hour,
          norm: norm.median_hour,
          note: ext.median_hour !== null ? `Puncak kejadian terdistribusi sekitar jam ${Math.round(ext.median_hour)}:00 WIB` : '—',
        },
      ];

      tbody.innerHTML = rows.map(r => `
        <tr>
          <td class="font-medium">${r.label}</td>
          <td class="text-right">${formatVal(r.ext, r.unit)}</td>
          <td class="text-right">${formatVal(r.norm, r.unit)}</td>
          <td class="text-right">${deltaVal(r.ext, r.norm, r.unit)}</td>
          <td class="text-xs text-muted">${r.note}</td>
        </tr>
      `).join('');
    },
    destroy: () => {
      container.remove();
    },
  };
}

// --- 7. Extreme Diurnal Probability Chart ---
export function createExtremeDiurnalChart(host: HTMLElement): {
  update: (diurnal: readonly ExtremeDiurnalHourly[]) => void;
  destroy: () => void;
} {
  const frame = element('div', 'extreme-diurnal-plot analysis-plot');
  const canvas = element('canvas');
  canvas.setAttribute('role', 'img');
  canvas.dataset['chart'] = 'extreme-diurnal';
  frame.append(canvas);
  host.append(frame);

  const hoursLabels = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`);

  const chart = new Chart<'line', (number | null)[], string>(canvas, {
    type: 'line',
    data: {
      labels: hoursLabels,
      datasets: [
        {
          label: 'Musim Karhutla (Agu–Okt)',
          data: [],
          borderColor: '#ea580c',
          backgroundColor: 'rgba(234, 88, 12, 0.15)',
          fill: true,
          tension: 0.25,
          borderWidth: 2.5,
          pointRadius: 4,
          pointHoverRadius: 6,
        },
        {
          label: 'Bulan Lainnya (Nov–Jul)',
          data: [],
          borderColor: '#0284c7',
          backgroundColor: 'rgba(2, 132, 199, 0.1)',
          fill: false,
          tension: 0.25,
          borderWidth: 2,
          pointRadius: 3.5,
          pointHoverRadius: 5.5,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: matchMedia('(prefers-reduced-motion: reduce)').matches ? false : { duration: 600 },
      plugins: {
        legend: {
          display: true,
          position: 'top',
          labels: { boxWidth: 12, font: { size: 12, weight: 600 } },
        },
        tooltip: {
          callbacks: {
            title: items => `Jam ${items[0]?.label ?? ''} WIB`,
            label: item => {
              const val = item.raw !== null ? Number(item.raw).toFixed(2) + '%' : '—';
              return `${item.dataset.label ?? ''}: ${val} probabilitas ekstrem`;
            },
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          title: { display: true, text: 'Jam Hari (WIB)' },
        },
        y: {
          beginAtZero: true,
          title: { display: true, text: 'Probabilitas Jam Ekstrem (%)' },
          ticks: {
            callback: value => `${value}%`,
            maxTicksLimit: 6,
          },
        },
      },
    },
  });

  const applyColors = (): void => {
    const theme = chartTheme();
    if (chart.options.scales?.['x']?.ticks) chart.options.scales['x'].ticks.color = theme.text;
    if (chart.options.scales?.['x']?.title) chart.options.scales['x'].title.color = theme.text;
    if (chart.options.scales?.['y']?.ticks) chart.options.scales['y'].ticks.color = theme.text;
    if (chart.options.scales?.['y']?.grid) chart.options.scales['y'].grid.color = theme.grid;
    if (chart.options.scales?.['y']?.title) chart.options.scales['y'].title.color = theme.text;
    if (chart.options.plugins?.legend?.labels) chart.options.plugins.legend.labels.color = theme.text;
  };

  const lifecycle = manageChart(chart, applyColors);

  return {
    update: diurnal => {
      canvas.setAttribute('aria-label', 'Probabilitas jam ekstrem per jam hari, perbandingan musim karhutla vs bulan lainnya');
      const hazeData = diurnal.map(d => d.haze_prob);
      const otherData = diurnal.map(d => d.nonhaze_prob);

      if (chart.data.datasets[0]) chart.data.datasets[0].data = hazeData;
      if (chart.data.datasets[1]) chart.data.datasets[1].data = otherData;

      applyColors();
      lifecycle.refresh();
    },
    destroy: () => {
      lifecycle.destroy();
      frame.remove();
    },
  };
}
