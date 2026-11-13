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
import type { CorrelationMatrix, DirectionSector, ExtremeVsNormal, WindBin } from './types';
import type { TrafficPoint } from './model';

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

export function createPollutionRose(host: HTMLElement, stationTitle: string, pollutant: () => PollutantName): {
  update: (sectors: readonly DirectionSector[]) => void;
  destroy: () => void;
} {
  const card = element('div', 'rose-card');

  const heading = element('h4', 'rose-title', stationTitle);

  const frame = element('div', 'rose-plot analysis-plot');

  const canvas = element('canvas');
  canvas.setAttribute('role', 'img');
  canvas.dataset['chart'] = 'pollution-rose';

  frame.append(canvas);
  card.append(heading, frame);
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
      animation: matchMedia('(prefers-reduced-motion: reduce)').matches ? false : { duration: 600 },
      plugins: {
        legend: { display: false },
        tooltip: {
          displayColors: false,
          callbacks: {
            title: items => `Arah Angin: ${items[0]?.label ?? ''}`,
            label: item => {
              const sec = currentSectors.find(s => s.direction_label === item.label);
              if (!sec || sec.mean_concentration === null) return 'Tidak cukup angin signifikan (<0.5 m/s)';
              return `Rerata ${pollutant()}: ${number(sec.mean_concentration)} µg/m³ (n=${number(sec.count)})`;
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
            font: { size: 12 },
            maxTicksLimit: 4,
          },
          grid: { color: 'rgba(148, 163, 184, 0.2)' },
          angleLines: { color: 'rgba(148, 163, 184, 0.2)' },
          pointLabels: {
            display: true,
            centerPointLabels: true,
            font: { size: 12, weight: 600 },
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

  return {
    update: sectors => {
      canvas.setAttribute('aria-label', `Mawar polusi ${pollutant()} · ${stationTitle}`);
      currentSectors = sectors;
      const sectorMap = new Map<string, DirectionSector>();
      sectors.forEach(s => sectorMap.set(s.direction_label, s));

      const values = SECTORS_ORDER.map(dir => {
        const sec = sectorMap.get(dir);
        return sec?.mean_concentration ?? null;
      });

      const dataset = chart.data.datasets[0];
      if (dataset) {
        dataset.data = values;
        dataset.backgroundColor = 'rgba(13, 148, 136, 0.65)';
      }
      applyColors();
      lifecycle.refresh();
    },
    destroy: () => {
      lifecycle.destroy();
      card.remove();
    },
  };
}

export function createCorrelationHeatmap(host: HTMLElement): {
  update: (matrix: CorrelationMatrix, stationName: string, modeName: string) => void;
  destroy: () => void;
} {
  const surface = matrixSurface(host, 'Matriks korelasi Spearman enam polutan dan tiga parameter cuaca');
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
    const width = cellWidth(), ctx = surface.size(left + 3 * width + 8, top + Math.max(1,pollutants.length) * cellHeight + 8);
    if (!ctx) return;
    const theme = chartTheme(); ctx.font = '12px Inter, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = theme.text;
    headers.forEach((lines, column) => lines.forEach((line, row) => ctx.fillText(line, left + column * width + width / 2, 12 + row * 15)));
    pollutants.forEach((pollutant, row) => {
      ctx.fillStyle = theme.text; ctx.textAlign = 'right';
      ctx.fillText(labels[row] ?? pollutant, left - 8, top + row * cellHeight + cellHeight / 2);
      weather.forEach((parameter, column) => {
        const value = currentMatrix[pollutant]?.[parameter] ?? null, colors = cellColors(value);
        ctx.fillStyle = colors.fill; ctx.fillRect(left + column * width + 2, top + row * cellHeight + 2, width - 4, cellHeight - 4);
        ctx.fillStyle = colors.text; ctx.textAlign = 'center';
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
      pollutants=Object.keys(matrix);labels=[...pollutants];
      canvas.setAttribute('aria-label', `Korelasi polutan dan cuaca di ${stationName}, ${modeName}; nilai tersedia pada alternatif teks.`);
      surface.alternative.textContent = pollutants.flatMap((pollutant, row) => weather.map((parameter, column) => {
        const value = matrix[pollutant]?.[parameter] ?? null;
        return `${labels[row]} × ${headers[column]?.join(' ')}: ${value === null ? 'tidak tersedia' : value.toFixed(3)}`;
      })).join('; ');
      render();
    },
    destroy(): void { controller.abort(); lifecycle.destroy(); surface.destroy(); },
  };
}

export function createWindBinsChart(host: HTMLElement, pollutant: () => PollutantName): {
  update: (allSiteBins: Record<string, readonly WindBin[]>, activeSiteTypes: readonly string[]) => void;
  destroy: () => void;
} {
  const frame = element('div', 'wind-bins-plot analysis-plot');
  const canvas = element('canvas');
  canvas.setAttribute('role', 'img');
  canvas.dataset['chart'] = 'wind-bins';
  frame.append(canvas);
  host.append(frame);

  const palette = ['#0284c7', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6'];
  const binLabels = ['0–0.5', '0.5–1', '1–2', '2–3', '3–5', '5+'];

  const chart = new Chart<'line', (number | null)[], string>(canvas, {
    type: 'line',
    data: { labels: binLabels, datasets: [] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: matchMedia('(prefers-reduced-motion: reduce)').matches ? false : { duration: 600 },
      interaction: { intersect: false, mode: 'index' },
      plugins: {
        legend: {
          display: false,
          position: 'top',
          labels: { boxWidth: 12, font: { size: 12 } },
        },
        tooltip: {
          callbacks: {
            label: item => `${item.dataset.label ?? ''}: ${item.raw !== null ? number(Number(item.raw)) + ' µg/m³' : '—'}`,
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
          title: { display: true, text: 'Median PM2.5 (µg/m³)' },
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
    if (chart.options.plugins?.legend?.labels) chart.options.plugins.legend.labels.color = theme.text;
  };

  const lifecycle = manageChart(chart, applyColors);
  const legend = seriesLegend(host, index => {
    const visible = !chart.isDatasetVisible(index);
    chart.setDatasetVisibility(index, visible); lifecycle.refresh(); return visible;
  });

  return {
    update: (allSiteBins, activeSiteTypes) => {
      if (chart.options.scales?.['y']?.title) chart.options.scales['y'].title.text = `Median ${pollutant()} (µg/m³)`;
      const datasets = activeSiteTypes.map((st, idx) => {
        const bins = allSiteBins[st] ?? [];
        const medians = binLabels.map(lbl => {
          const b = bins.find(item => item.label === lbl);
          return b && b.median_concentration !== null ? b.median_concentration : null;
        });
        const color = palette[idx % palette.length] ?? '#0284c7';
        return {
          label: st,
          data: medians,
          borderColor: color,
          backgroundColor: color,
          borderWidth: 2,
          pointRadius: 4,
          tension: 0.15,
        };
      });

      chart.data.datasets = datasets;
      legend.update(datasets.map((dataset, index) => ({ label: dataset.label ?? '', color: typeof dataset.borderColor === 'string' ? dataset.borderColor : '#0284c7', visible: chart.isDatasetVisible(index) })));
      applyColors();
      lifecycle.refresh();
    },
    destroy: () => {
      legend.destroy(); lifecycle.destroy();
      frame.remove();
    },
  };
}

export function createTrafficScatter(host: HTMLElement): {
  update: (points: readonly TrafficPoint[], pollutant: PollutantName) => void;
  destroy: () => void;
} {
  const frame = element('div', 'traffic-scatter-plot analysis-plot');
  const canvas = element('canvas');
  canvas.setAttribute('role', 'img');
  canvas.dataset['chart'] = 'traffic-scatter';
  frame.append(canvas);
  const controller = new AbortController();
  const legend = element('div', 'analysis-legend analysis-chart-legend');
  const legendDetails = analysisDetails(legend, 'Legenda tipe lokasi');
  host.append(frame, legendDetails);

  const siteTypeColors: Record<string, string> = {
    'Traffic / Roadside': '#ef4444',
    'Urban Background': '#0284c7',
    'Urban Coastal Background': '#0d9488',
    'Regional / Clean Background': '#16a34a',
    'Peatland Boundary': '#ea580c',
    'Industrial Perimeter': '#8b5cf6',
  };

  let groupedPoints: readonly (readonly TrafficPoint[])[] = [];

  const chart = new Chart<'scatter', Array<{ x: number; y: number }>, string>(canvas, {
    type: 'scatter',
    data: { datasets: [] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: matchMedia('(prefers-reduced-motion: reduce)').matches ? false : { duration: 600 },
      plugins: {
        legend: {
          display: false,
          position: 'top',
          labels: { boxWidth: 10, font: { size: 12 } },
        },
        tooltip: {
          callbacks: {
            label: item => {
              const pt = groupedPoints[item.datasetIndex]?.[item.dataIndex];
              if (!pt) return '';
              const xVal = item.parsed.x !== null ? number(item.parsed.x) : '—';
              const yVal = item.parsed.y !== null ? number(item.parsed.y) : '—';
              return `${pt.station} (${pt.siteType}): ${xVal} kend/jam → ${yVal} µg/m³`;
            },
          },
        },
      },
      scales: {
        x: {
          beginAtZero: true,
          title: { display: true, text: 'Lalu lintas (kendaraan/jam)' },
        },
        y: {
          beginAtZero: true,
          title: { display: true, text: 'Rerata Konsentrasi NO2 (µg/m³)' },
          ticks: { maxTicksLimit: 6 },
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
    if (chart.options.scales?.['y']?.grid) chart.options.scales['y'].grid.color = theme.grid;
    if (chart.options.scales?.['y']?.title) chart.options.scales['y'].title.color = theme.text;
    if (chart.options.plugins?.legend?.labels) chart.options.plugins.legend.labels.color = theme.text;
  };

  const lifecycle = manageChart(chart, applyColors);

  legend.addEventListener('click', event => {
    const target = event.target instanceof Element ? event.target.closest('button[data-dataset]') : null;
    if (!(target instanceof HTMLButtonElement)) return;
    const index = Number(target.dataset['dataset']);
    if (!chart.data.datasets[index]) return;
    const selected = !chart.isDatasetVisible(index);
    chart.setDatasetVisibility(index, selected); setSelected(target, selected); lifecycle.refresh();
  }, { signal: controller.signal });

  return {
    update: (points, pollutant) => {
      canvas.setAttribute('aria-label', `Konsentrasi ${pollutant.toUpperCase()} dan lalu lintas; ${points.length} stasiun dalam cakupan.`);
      const unit = pollutant;
      if (chart.options.scales?.['y']?.title) {
        chart.options.scales['y'].title.text = `Rerata Konsentrasi ${unit} (µg/m³)`;
      }

      // Group points by siteType
      const groups = new Map<string, TrafficPoint[]>();
      points.forEach(pt => {
        const list = groups.get(pt.siteType) ?? [];
        list.push(pt);
        groups.set(pt.siteType, list);
      });

      groupedPoints = [...groups.values()].map(points => points.filter(point => point.concentration !== null));
      const datasets = Array.from(groups.entries()).map(([st], index) => {
        const pts = groupedPoints[index] ?? [];
        const color = siteTypeColors[st] ?? '#64748b';
        const coordinates = pts.flatMap(p => { const y = p.concentration; return y === null ? [] : [{ x: p.traffic, y }]; });
        return {
          label: st,
          data: coordinates,
          backgroundColor: color,
          borderColor: color,
          pointRadius: 6,
          pointHoverRadius: 8,
        };
      });

      chart.data.datasets = datasets;
      legend.replaceChildren(...datasets.map((dataset, index) => {
        const control = element('button'); control.type = 'button'; control.dataset['dataset'] = String(index);
        setSelected(control, true);
        const swatch = element('i', 'swatch'); swatch.style.backgroundColor = dataset.backgroundColor;
        swatch.setAttribute('aria-hidden', 'true'); control.append(swatch, document.createTextNode(dataset.label));
        return control;
      }));
      applyColors();
      lifecycle.refresh();
    },
    destroy: () => {
      controller.abort(); legendDetails.remove();
      lifecycle.destroy();
      frame.remove();
    },
  };
}

export function createExtremeComparisonChart(host: HTMLElement): {
  update: (data: ExtremeVsNormal) => void;
  destroy: () => void;
} {
  const container = element('div', 'extreme-comparison-container');

  // Left: Grouped Bar Chart (Meteorology & Season Share)
  const leftBox = element('div', 'extreme-bar-box');
  const leftTitle = element('h4', '', 'Indikator Cuaca & Musim');
  const leftFrame = element('div', 'analysis-plot');
  const leftCanvas = element('canvas');
  leftFrame.append(leftCanvas);
  leftBox.append(leftTitle, leftFrame);

  // Right: 24-hour Distribution Histogram
  const rightBox = element('div', 'extreme-hour-box');
  const rightTitle = element('h4', '', 'Waktu Terjadinya Jam Ekstrem');
  const rightFrame = element('div', 'analysis-plot');
  const rightCanvas = element('canvas');
  rightFrame.append(rightCanvas);
  rightBox.append(rightTitle, rightFrame);

  container.append(leftBox, rightBox);
  host.append(container);

  // Chart 1: Bar chart
  const barMetrics = ['Kecepatan Angin (m/s)', 'Kelembapan (%)', 'Suhu (°C)', 'Proporsi Karhutla (%)'];
  const barChart = new Chart<'bar', (number|null)[], string>(leftCanvas, {
    type: 'bar',
    data: {
      labels: barMetrics,
      datasets: [
        { label: 'Jam Ekstrem (>P95)', data: [], backgroundColor: '#ef4444', borderRadius: 4 },
        { label: 'Jam Normal (≤P95)', data: [], backgroundColor: '#0284c7', borderRadius: 4 },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: matchMedia('(prefers-reduced-motion: reduce)').matches ? false : { duration: 600 },
      scales: {
        x: { grid: { display: false }, ticks: { maxRotation: 0, autoSkip: false, callback: function(value) { return this.getLabelForValue(Number(value)).replace('Kecepatan Angin', 'Angin').replace('Proporsi Karhutla', 'Karhutla').split(' '); } } },
        y: { beginAtZero: true, ticks: { maxTicksLimit: 5 } },
      },
    },
  });

  // Chart 2: 24-hour distribution line/bar chart
  const hours = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}`);
  const hourChart = new Chart<'bar', number[], string>(rightCanvas, {
    type: 'bar',
    data: {
      labels: hours,
      datasets: [
        {
          label: 'Jumlah Jam Ekstrem',
          data: [],
          backgroundColor: 'rgba(239, 68, 68, 0.75)',
          borderRadius: 3,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: matchMedia('(prefers-reduced-motion: reduce)').matches ? false : { duration: 600 },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            title: items => `Jam ${items[0]?.label ?? ''}:00 WIB`,
            label: item => `Frekuensi Ekstrem: ${number(Number(item.raw))} observasi`,
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
          title: { display: true, text: 'Jumlah Kejadian' },
          ticks: { maxTicksLimit: 5 },
        },
      },
    },
  });

  const applyColors = (): void => {
    const theme = chartTheme();
    [barChart, hourChart].forEach(c => {
      if (c.options.scales?.['x']?.title) c.options.scales['x'].title.color = theme.text;
      if (c.options.scales?.['y']?.title) c.options.scales['y'].title.color = theme.text;
      if (c.options.plugins?.legend?.labels) c.options.plugins.legend.labels.color = theme.text;
      if (c.options.scales?.['x']?.ticks) c.options.scales['x'].ticks.color = theme.text;
      if (c.options.scales?.['y']?.ticks) c.options.scales['y'].ticks.color = theme.text;
      if (c.options.scales?.['y']?.grid) c.options.scales['y'].grid.color = theme.grid;
    });
  };

  const barLifecycle = manageChart(barChart, applyColors);
  const hourLifecycle = manageChart(hourChart, applyColors);

  return {
    update: data => {
      const ext = data.extreme;
      const norm = data.normal;

      const extremeDataset = barChart.data.datasets[0];
      const normalDataset = barChart.data.datasets[1];
      const hourlyDataset = hourChart.data.datasets[0];
      if (extremeDataset) extremeDataset.data = [
        ext.median_wind_speed,
        ext.median_humidity,
        ext.median_temperature,
        ext.haze_season_share === null ? null : ext.haze_season_share * 100,
      ];
      if (normalDataset) normalDataset.data = [
        norm.median_wind_speed,
        norm.median_humidity,
        norm.median_temperature,
        norm.haze_season_share === null ? null : norm.haze_season_share * 100,
      ];
      barLifecycle.refresh();

      if (hourlyDataset) hourlyDataset.data = [...ext.hour_distribution];
      hourLifecycle.refresh();
    },
    destroy: () => {
      barLifecycle.destroy();
      hourLifecycle.destroy();
      container.remove();
    },
  };
}
