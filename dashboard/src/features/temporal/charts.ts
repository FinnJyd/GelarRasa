import { seriesLegend } from '../../shared/series-legend';
import type { PollutantName } from '../../data/types';
import { REFERENCES } from '../../shared/pollutants';
import {
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
  ScatterController,
  Tooltip,
} from 'chart.js';
import { chartTheme, manageChart } from '../../shared/chart-lifecycle';
import { manageCanvas } from '../../shared/canvas-lifecycle';
import { matrixLegend, matrixSurface } from '../../shared/matrix-surface';
import { element, emptyState } from '../../shared/dom';
import type { ChartDataset, Plugin } from 'chart.js';
import { date, number } from '../../shared/format';
import { computeDailyStationAggregate } from './model';
import type { EpisodeScatterPoint, EpisodeWithStation, MonthSummary } from './model';

Chart.register(
  BarController,
  BarElement,
  CategoryScale,
  Filler,
  Legend,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  ScatterController,
  Tooltip,
);

export interface DiurnalPointData {
  hour: number;
  median: number | null;
  p25: number | null;
  p75: number | null;
}

export function createDiurnalChart(host: HTMLElement, pollutant: () => PollutantName): {
  updateSingle: (points: readonly DiurnalPointData[], label: string) => void;
  updateOverlay: (
    hotspotHaze: readonly DiurnalPointData[],
    hotspotNonHaze: readonly DiurnalPointData[],
  ) => void;
  destroy: () => void;
} {
  const frame = element('div', 'diurnal-plot analysis-plot');

  const canvas = element('canvas');
  canvas.setAttribute('role', 'img');
  canvas.dataset['chart'] = 'diurnal';
  const empty = emptyState('Data belum mencukupi', 'Tidak ada data valid untuk jam ini.');
  empty.hidden = true;
  frame.append(canvas);
  host.append(frame, empty);

  const hours = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`);

  const chart = new Chart<'line', (number | null)[], string>(canvas, {
    type: 'line',
    data: {
      labels: hours,
      datasets: [],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: matchMedia('(prefers-reduced-motion: reduce)').matches ? false : { duration: 600 },
      interaction: { intersect: false, mode: 'index' },
      plugins: {
        legend: {
          display: true,
          position: 'top',
          labels: {
            boxWidth: 14,
            font: { size: 12, family: 'Inter, sans-serif' },
            padding: 12,
            filter: item => item.text !== 'P75',
          },
          onClick: (_e, legendItem, legend) => {
            const chartInstance = legend.chart;
            const index = legendItem.datasetIndex;
            if (index === undefined) return;
            const currentlyVisible = chartInstance.isDatasetVisible(index);
            chartInstance.setDatasetVisibility(index, !currentlyVisible);
            if (chartInstance.data.datasets[1]?.label === 'P75' && index === 2) {
              chartInstance.setDatasetVisibility(1, !currentlyVisible);
            }
            chartInstance.update();
          },
        },
        tooltip: {
          displayColors: true,
          filter: item => item.dataset.label !== 'P75',
          callbacks: {
            label: item => {
              if (item.dataset.label === 'Rentang P25–P75') {
                const p75 = item.chart.data.datasets[1]?.data[item.dataIndex];
                if (item.raw !== null && typeof p75 === 'number') {
                  return `Rentang P25–P75: ${number(Number(item.raw))} – ${number(p75)} µg/m³`;
                }
              }
              return `${item.dataset.label ?? ''}: ${item.raw !== null ? number(Number(item.raw)) + ' µg/m³' : '—'}`;
            },
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          title: { display: true, text: 'Jam (WIB)' },
          ticks: { maxTicksLimit: 6, maxRotation: 0 },
        },
        y: {
          beginAtZero: true,
          title: { display: true, text: 'PM2.5 (µg/m³)' },
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

  return {
    updateSingle: (points, label) => {
      canvas.setAttribute('aria-label', `Profil ${pollutant()} per jam · ${label} · median dan P25–P75.`);
      const medians = points.map(p => p.median);
      const p25s = points.map(p => p.p25);
      const p75s = points.map(p => p.p75);
      const hasData = medians.some(v => v !== null);
      empty.hidden = hasData;
      canvas.hidden = !hasData;
      if (!hasData) return;

      if(chart.options.scales?.['y']?.title) chart.options.scales['y'].title.text = `${pollutant()} (µg/m³)`;
      chart.data.datasets = [
        {
          label: `${label} (Median)`,
          data: medians,
          borderColor: '#0284c7',
          backgroundColor: '#0284c7',
          borderWidth: 2.5,
          pointRadius: 3,
          pointHoverRadius: 5,
          tension: 0.2,
          order: 1,
        },
        {
          label: 'P75',
          data: p75s,
          borderColor: 'transparent',
          backgroundColor: 'transparent',
          pointRadius: 0,
          borderWidth: 0,
          tension: 0.2,
          order: 2,
        },
        {
          label: 'Rentang P25–P75',
          data: p25s,
          borderColor: 'rgba(2, 132, 199, 0.45)',
          backgroundColor: 'rgba(2, 132, 199, 0.16)',
          pointRadius: 0,
          borderWidth: 1,
          fill: '-1',
          tension: 0.2,
          order: 3,
        },
      ];
      applyColors();
      lifecycle.refresh();
    },
    updateOverlay: (hotspotHaze, hotspotNonHaze) => {
      canvas.setAttribute('aria-label', `Perbandingan profil ${pollutant()} per jam pada seluruh stasiun pilihan; Agu–Okt dan Nov–Jul.`);
      if(chart.options.scales?.['y']?.title) chart.options.scales['y'].title.text = `${pollutant()} (µg/m³)`;
      chart.data.datasets = [
        {
          label: 'Pilihan · Agu–Okt',
          data: hotspotHaze.map(p => p.median),
          borderColor: '#dc2626',
          backgroundColor: '#dc2626',
          borderWidth: 2.8,
          pointRadius: 3,
          tension: 0.2,
        },
        {
          label: 'Pilihan · Nov–Jul',
          data: hotspotNonHaze.map(p => p.median),
          borderColor: '#0d9488',
          backgroundColor: '#0d9488',
          borderWidth: 2,
          borderDash: [5, 4],
          pointRadius: 2,
          tension: 0.2,
        },

      ];
      empty.hidden = true;
      canvas.hidden = false;
      applyColors();
      lifecycle.refresh();
    },
    destroy: () => {
      lifecycle.destroy();
      frame.remove();
    },
  };
}

export function createHeatmapChart(host: HTMLElement, pollutant: () => PollutantName): {
  update: (grid: (number | null)[][], stationCode: string) => void;
  destroy: () => void;
} {
  const surface = matrixSurface(host, 'PM2.5 menurut hari dan jam; geser untuk melihat seluruh jam');
  surface.root.classList.add('temporal-matrix');
  const { canvas, viewport } = surface;
  const controller = new AbortController();
  const days = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
  let currentGrid: (number | null)[][] = [];
  let currentStation = '';
  const left = 64, top = 28, cellHeight = 30;
  const cellWidth = (): number => Math.max(26, Math.floor((viewport.clientWidth - left - 8) / 24));
  let minimum: number | null = null;
  let maximum: number | null = null;

  function cellColor(value: number | null, theme: ReturnType<typeof chartTheme>): string {
    if (value === null) return theme.grid;
    if (minimum === null || maximum === null || maximum <= minimum) {
      return 'rgba(2, 132, 199, 0.5)';
    }
    const t = Math.max(0, Math.min(1, (value - minimum) / (maximum - minimum)));
    if (t <= 0.5) {
      const u = t / 0.5;
      const r = Math.round(2 + u * 232);
      const g = Math.round(132 - u * 44);
      const b = Math.round(199 - u * 187);
      const a = 0.55 + u * 0.25;
      return `rgba(${r}, ${g}, ${b}, ${a.toFixed(2)})`;
    }
    const u = (t - 0.5) / 0.5;
    const r = Math.round(234 - u * 14);
    const g = Math.round(88 - u * 50);
    const b = Math.round(12 + u * 26);
    const a = 0.80 + u * 0.18;
    return `rgba(${r}, ${g}, ${b}, ${a.toFixed(2)})`;
  }

  function render(): void {
    const width = cellWidth();
    const ctx = surface.size(left + width * 24 + 8, top + days.length * cellHeight + 8);
    if (!ctx) return;
    const theme = chartTheme();
    ctx.font = '12px Inter, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.fillStyle = theme.text;
    for (let hour = 0; hour < 24; hour++) ctx.fillText(String(hour).padStart(2, '0'), left + hour * width + width / 2, top - 8);
    days.forEach((day, row) => {
      ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; ctx.fillStyle = theme.text;
      ctx.fillText(day, left - 8, top + row * cellHeight + cellHeight / 2);
      for (let hour = 0; hour < 24; hour++) {
        const value = currentGrid[row]?.[hour] ?? null;
        ctx.fillStyle = cellColor(value, theme);
        ctx.fillRect(left + hour * width + 1, top + row * cellHeight + 1, width - 2, cellHeight - 2);
      }
    });
  }
  const show = (event: PointerEvent): void => {
    const bounds = canvas.getBoundingClientRect();
    const hour = Math.floor((event.clientX - bounds.left - left) / cellWidth());
    const row = Math.floor((event.clientY - bounds.top - top) / cellHeight);
    if (hour < 0 || hour >= 24 || row < 0 || row >= days.length) { surface.hide(); return; }
    const value = currentGrid[row]?.[hour] ?? null;
    surface.show(event, `${days[row]} · ${String(hour).padStart(2, '0')}:00 WIB\n${currentStation}\nMedian ${pollutant()}: ${value === null ? 'Tidak tersedia' : number(value) + ' µg/m³'}`);
  };
  canvas.addEventListener('pointermove', show, { signal: controller.signal });
  canvas.addEventListener('pointerdown', show, { signal: controller.signal });
  canvas.addEventListener('pointerleave', surface.hide, { signal: controller.signal });
  const lifecycle = manageCanvas(viewport, render);
  return {
    update(grid, stationCode): void {
      currentGrid = grid; currentStation = stationCode;
      const available = grid.flat().filter((value): value is number => value !== null);
      minimum = available.length ? Math.min(...available) : null;
      maximum = available.length ? Math.max(...available) : null;
      surface.legend.replaceChildren();
      const theme = chartTheme();
      if (minimum === null || maximum === null) {
        matrixLegend(surface.legend, `${pollutant()} (µg/m³)`, [['Tidak tersedia', theme.grid]]);
      } else if (minimum === maximum) {
        matrixLegend(surface.legend, `${pollutant()} (µg/m³)`, [[`${number(minimum)} · seragam`, '#0284c7']]);
      } else {
        matrixLegend(surface.legend, `${pollutant()} (µg/m³)`, [
          [`Rendah (${number(minimum)})`, '#0284c7'],
          [`Sedang (${number((minimum + maximum) / 2)})`, '#ea580c'],
          [`Tinggi (${number(maximum)})`, '#dc2626'],
        ]);
      }
      canvas.setAttribute('aria-label', `Median ${pollutant()} menurut hari dan jam di ${stationCode}; nilai tersedia pada alternatif teks.`);
      surface.alternative.textContent = days.flatMap((day, row) => Array.from({ length: 24 }, (_, hour) => {
        const value = grid[row]?.[hour] ?? null;
        return `${day} ${hour}:00: ${value === null ? 'tidak tersedia' : number(value) + ' µg/m³'}`;
      })).join('; ');
      render();
    },
    destroy(): void { controller.abort(); lifecycle.destroy(); surface.destroy(); },
  };
}

export function createTimeseriesChart(host: HTMLElement, pollutant: () => PollutantName): {
  update: (dates: readonly string[], stations: Record<string, readonly (number | null)[]>, mode: 'aggregate' | 'stations', isCapped: boolean) => void;
  destroy: () => void;
} {
  const frame = element('div', 'timeseries-plot analysis-plot');
  const canvas = element('canvas');
  canvas.setAttribute('role', 'img');
  canvas.dataset['chart'] = 'timeseries';
  frame.append(canvas);
  host.append(frame);

  const palette = ['#dc2626', '#ea580c', '#0284c7', '#0d9488', '#8b5cf6', '#16a34a', '#ec4899'];

  const chart = new Chart<'line', (number | null)[], string>(canvas, {
    type: 'line',
    data: { labels: [], datasets: [] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: matchMedia('(prefers-reduced-motion: reduce)').matches ? false : { duration: 600 },
      interaction: { intersect: false, mode: 'index' },
      plugins: {
        legend: {
          display: true,
          position: 'top',
          labels: {
            boxWidth: 14,
            font: { size: 12, family: 'Inter, sans-serif' },
            padding: 10,
            filter: item => item.text !== 'P75',
          },
          onClick: (_e, legendItem, legendInstance) => {
            const chartInstance = legendInstance.chart;
            const index = legendItem.datasetIndex;
            if (index === undefined) return;
            const currentlyVisible = chartInstance.isDatasetVisible(index);
            chartInstance.setDatasetVisibility(index, !currentlyVisible);
            if (chartInstance.data.datasets[1]?.label === 'P75' && index === 2) {
              chartInstance.setDatasetVisibility(1, !currentlyVisible);
            }
            chartInstance.update();
          },
        },
        tooltip: {
          displayColors: true,
          filter: item => item.dataset.label !== 'P75',
          callbacks: {
            label: item => `${item.dataset.label ?? ''}: ${item.raw !== null ? number(Number(item.raw)) + ' µg/m³' : '—'}`,
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { maxTicksLimit: 5, maxRotation: 0 },
        },
        y: {
          beginAtZero: true,
          title: { display: true, text: 'Rata-rata Harian PM2.5 (µg/m³)' },
          ticks: { maxTicksLimit: 6 },
        },
      },
    },
  });

  const applyColors = (): void => {
    const theme = chartTheme();
    if (chart.options.scales?.['x']?.ticks) chart.options.scales['x'].ticks.color = theme.text;
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
    update: (dates, stations, mode, isCapped) => {
      const stationCount = Object.keys(stations).length;
      canvas.setAttribute(
        'aria-label',
        mode === 'aggregate'
          ? `Tren ${pollutant()} harian (agregat) · ${stationCount} stasiun · median dan rentang P25–P75.`
          : `Tren ${pollutant()} harian · ${stationCount} stasiun · ${isCapped ? 'fokus 0–150 µg/m³' : 'skala penuh'}.`
      );
      chart.data.labels = dates.map(date);
      if (chart.options.scales?.['y']?.title) chart.options.scales['y'].title.text = `Rata-rata harian ${pollutant()} (µg/m³)`;

      if (chart.options.scales?.['y']) {
        if (isCapped) {
          chart.options.scales['y'].max = 150;
        } else {
          chart.options.scales['y'].max = undefined;
        }
      }

      const reference = REFERENCES[pollutant()];

      if (mode === 'aggregate') {
        const aggregates = computeDailyStationAggregate(dates, stations);
        const medians = aggregates.map(a => a.median);
        const p25s = aggregates.map(a => a.p25);
        const p75s = aggregates.map(a => a.p75);

        const datasets: ChartDataset<'line', (number | null)[]>[] = [
          {
            label: 'Median stasiun pilihan',
            data: medians,
            borderColor: '#0284c7',
            backgroundColor: '#0284c7',
            borderWidth: 2.4,
            pointRadius: 0,
            pointHoverRadius: 4,
            tension: 0.15,
            order: 1,
          },
          {
            label: 'P75',
            data: p75s,
            borderColor: 'transparent',
            backgroundColor: 'transparent',
            pointRadius: 0,
            borderWidth: 0,
            tension: 0.15,
            order: 2,
          },
          {
            label: 'Rentang P25–P75',
            data: p25s,
            borderColor: 'rgba(2, 132, 199, 0.45)',
            backgroundColor: 'rgba(2, 132, 199, 0.18)',
            pointRadius: 0,
            borderWidth: 1,
            fill: '-1',
            tension: 0.15,
            order: 3,
          },
        ];

        if (reference.hours === 24) {
          datasets.push({
            label: `PP harian · ${reference.daily} µg/m³`,
            data: dates.map(() => reference.daily),
            borderColor: '#dc2626',
            borderDash: [6, 4],
            pointRadius: 0,
            borderWidth: 1.8,
            order: 4,
          });
        }
        if (reference.annual !== null) {
          datasets.push({
            label: `PP tahunan · ${reference.annual} µg/m³ (konteks)`,
            data: dates.map(() => reference.annual),
            borderColor: '#16a34a',
            borderDash: [4, 4],
            pointRadius: 0,
            borderWidth: 1.5,
            order: 5,
          });
        }

        chart.data.datasets = datasets;

        if (chart.options.plugins?.legend) {
          chart.options.plugins.legend.display = true;
        }

        if (chart.options.plugins?.tooltip) {
          chart.options.plugins.tooltip.filter = item => item.dataset.label !== 'P75';
          chart.options.plugins.tooltip.callbacks = {
            label: item => {
              if (item.dataset.label === 'Rentang P25–P75') {
                const p75 = item.chart.data.datasets[1]?.data[item.dataIndex];
                if (item.raw !== null && typeof p75 === 'number') {
                  return `Rentang P25–P75: ${number(Number(item.raw))} – ${number(p75)} µg/m³`;
                }
              }
              const agg = aggregates[item.dataIndex];
              const countSuffix = item.datasetIndex === 0 && agg && agg.stationCount > 0 ? ` (${agg.stationCount} stasiun)` : '';
              return `${item.dataset.label ?? ''}: ${item.raw !== null ? number(Number(item.raw)) + ' µg/m³' : '—'}${countSuffix}`;
            },
          };
        }

        legend.setVisible(false);
      } else {
        const datasets: ChartDataset<'line', (number | null)[]>[] = Object.entries(stations).map(([code, values], idx) => ({
          label: code,
          data: [...values],
          borderColor: palette[idx % palette.length] ?? '#0284c7',
          backgroundColor: palette[idx % palette.length] ?? '#0284c7',
          borderWidth: 1.8,
          pointRadius: 0,
          pointHoverRadius: 4,
          tension: 0.1,
        }));

        if (reference.hours === 24) datasets.push({ label: `PP harian · ${reference.daily} µg/m³`, data: dates.map(() => reference.daily), borderColor: '#dc2626', borderDash: [6, 4], pointRadius: 0, borderWidth: 2 });
        if (reference.annual !== null) datasets.push({ label: `PP tahunan · ${reference.annual} µg/m³ (konteks)`, data: dates.map(() => reference.annual), borderColor: '#16a34a', borderDash: [4, 4], pointRadius: 0, borderWidth: 1.5 });

        chart.data.datasets = datasets;

        if (chart.options.plugins?.legend) {
          chart.options.plugins.legend.display = false;
        }

        if (chart.options.plugins?.tooltip) {
          chart.options.plugins.tooltip.filter = () => true;
          chart.options.plugins.tooltip.callbacks = {
            label: item => `${item.dataset.label ?? ''}: ${item.raw !== null ? number(Number(item.raw)) + ' µg/m³' : '—'}`,
          };
        }

        legend.setVisible(true);
        legend.update(datasets.map((dataset, index) => ({ label: dataset.label ?? '', color: typeof dataset.borderColor === 'string' ? dataset.borderColor : '#0284c7', visible: chart.isDatasetVisible(index) })));
      }

      applyColors();
      lifecycle.refresh();
    },
    destroy: () => {
      legend.destroy(); lifecycle.destroy();
      frame.remove();
    },
  };
}

const STATION_PALETTE = [
  { bg: 'rgba(2, 132, 199, 0.16)', border: 'rgba(2, 132, 199, 0.45)', text: '#0284c7' }, // Blue
  { bg: 'rgba(217, 119, 6, 0.16)', border: 'rgba(217, 119, 6, 0.45)', text: '#d97706' }, // Amber
  { bg: 'rgba(13, 148, 136, 0.16)', border: 'rgba(13, 148, 136, 0.45)', text: '#0d9488' }, // Teal
  { bg: 'rgba(139, 92, 246, 0.16)', border: 'rgba(139, 92, 246, 0.45)', text: '#8b5cf6' }, // Purple
  { bg: 'rgba(225, 29, 72, 0.16)', border: 'rgba(225, 29, 72, 0.45)', text: '#e11d48' }, // Rose
  { bg: 'rgba(22, 163, 74, 0.16)', border: 'rgba(22, 163, 74, 0.45)', text: '#16a34a' }, // Green
  { bg: 'rgba(234, 88, 12, 0.16)', border: 'rgba(234, 88, 12, 0.45)', text: '#ea580c' }, // Orange
  { bg: 'rgba(8, 145, 178, 0.16)', border: 'rgba(8, 145, 178, 0.45)', text: '#0891b2' }, // Cyan
  { bg: 'rgba(99, 102, 241, 0.16)', border: 'rgba(99, 102, 241, 0.45)', text: '#6366f1' }, // Indigo
  { bg: 'rgba(219, 39, 119, 0.16)', border: 'rgba(219, 39, 119, 0.45)', text: '#db2777' }, // Pink
];

export function createEpisodesChart(host: HTMLElement, pollutant: () => PollutantName): {
  update: (episodes: readonly EpisodeWithStation[]) => void;
  destroy: () => void;
} {
  const frame = element('div', 'episodes-plot analysis-plot');
  const canvas = element('canvas');
  canvas.setAttribute('role', 'img');
  canvas.dataset['chart'] = 'episodes';
  frame.append(canvas);
  host.append(frame);

  let currentEpisodes: readonly EpisodeWithStation[] = [];
  let stationColors = new Map<string, { bg: string; border: string; text: string }>();

  const badgeLabels: Plugin<'bar'> = {
    id: 'episodes-badge-labels',
    afterDraw: chartInstance => {
      const yScale = chartInstance.scales['y'];
      if (!yScale || !currentEpisodes.length) return;
      const ctx = chartInstance.ctx;
      const theme = chartTheme();
      ctx.save();
      for (let i = 0; i < currentEpisodes.length; i++) {
        const ep = currentEpisodes[i];
        if (!ep) continue;
        const y = yScale.getPixelForTick(i);
        const color = stationColors.get(ep.station) ?? STATION_PALETTE[0]!;
        const code = ep.station.replace('AQMS-', '');
        const dateStr = ` · ${ep.start.slice(0, 7)}`;

        ctx.font = '600 11px Inter, sans-serif';
        const codeW = ctx.measureText(code).width;
        ctx.font = '11px Inter, sans-serif';
        const dateW = ctx.measureText(dateStr).width;

        const badgePadX = 6;
        const badgeW = codeW + badgePadX * 2;
        const badgeH = 18;
        const totalW = badgeW + 4 + dateW;
        const endX = chartInstance.chartArea.left - 6;
        const badgeX = Math.max(4, endX - totalW);
        const badgeY = y - badgeH / 2;

        ctx.fillStyle = color.bg;
        ctx.strokeStyle = color.border;
        ctx.lineWidth = 1;
        ctx.beginPath();
        if (typeof ctx.roundRect === 'function') {
          ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 4);
        } else {
          ctx.rect(badgeX, badgeY, badgeW, badgeH);
        }
        ctx.fill();
        ctx.stroke();

        ctx.font = '600 11px Inter, sans-serif';
        ctx.fillStyle = color.text;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(code, badgeX + badgeW / 2, y + 0.5);

        ctx.font = '11px Inter, sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = theme.text;
        ctx.fillText(dateStr, badgeX + badgeW + 3, y + 0.5);
      }
      ctx.restore();
    },
  };

  const chart = new Chart<'bar', number[], string>(canvas, {
    type: 'bar',
    data: { labels: [], datasets: [] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: 'y',
      animation: matchMedia('(prefers-reduced-motion: reduce)').matches ? false : { duration: 600 },
      plugins: {
        legend: { display: false },
        tooltip: {
          displayColors: false,
          callbacks: {
            title: items => {
              const ep = currentEpisodes[items[0]?.dataIndex ?? -1];
              return ep ? `${ep.station} · Periode: ${ep.start} s.d. ${ep.end}` : '';
            },
            label: item => {
              const ep = currentEpisodes[item.dataIndex];
              return ep
                ? `Durasi: ${ep.duration_days} hari | Puncak: ${number(ep.peak_concentration)} µg/m³ | Rerata: ${number(ep.mean_concentration)} µg/m³`
                : '';
            },
          },
        },
      },
      scales: {
        x: {
          beginAtZero: true,
          title: { display: true, text: 'Durasi (hari >55 µg/m³)' },
          ticks: { maxTicksLimit: 6 },
        },
        y: {
          grid: { display: false },
          ticks: { autoSkip: false },
          afterFit: axis => { axis.width += 10; },
        },
      },
    },
    plugins: [badgeLabels],
  });

  const applyColors = (): void => {
    const theme = chartTheme();
    if (chart.options.scales?.['x']?.ticks) chart.options.scales['x'].ticks.color = theme.text;
    if (chart.options.scales?.['x']?.grid) chart.options.scales['x'].grid.color = theme.grid;
    if (chart.options.scales?.['x']?.title) chart.options.scales['x'].title.color = theme.text;
    if (chart.options.scales?.['y']?.ticks) chart.options.scales['y'].ticks.color = 'transparent';
  };

  const lifecycle = manageChart(chart, applyColors);

  return {
    update: episodes => {
      currentEpisodes = episodes;

      stationColors = new Map();
      let colorIdx = 0;
      for (const ep of episodes) {
        if (!stationColors.has(ep.station)) {
          stationColors.set(ep.station, STATION_PALETTE[colorIdx % STATION_PALETTE.length]!);
          colorIdx++;
        }
      }

      const reference = REFERENCES[pollutant()];
      if(chart.options.scales?.['x']?.title) chart.options.scales['x'].title.text = `Durasi (hari >${reference.daily} µg/m³ · ${reference.hours} jam)`;
      frame.style.setProperty('--analysis-rows', String(episodes.length));
      canvas.setAttribute('aria-label', `Durasi ${episodes.length} episode ekstrem; nilai dan periode tersedia pada tooltip.`);
      chart.data.labels = episodes.map(ep => {
        const code = ep.station.replace('AQMS-', '');
        return `  ${code} · ${ep.start.slice(0, 7)}  `;
      });
      chart.data.datasets = [{
        label: 'Durasi (Hari)',
        data: episodes.map(ep => ep.duration_days),
        backgroundColor: episodes.map(ep => ep.duration_days > 100 ? '#ef4444' : ep.duration_days > 30 ? '#ea580c' : '#0284c7'),
        borderRadius: 4,
      }];
      applyColors();
      lifecycle.refresh();
    },
    destroy: () => {
      lifecycle.destroy();
      frame.remove();
    },
  };
}

export function createMonthlySeasonalityChart(host: HTMLElement, pollutant: () => PollutantName): {
  update: (data: readonly MonthSummary[], mode: 'years' | 'distribution') => void;
  destroy: () => void;
} {
  const frame = element('div', 'monthly-seasonality-plot analysis-plot');
  const canvas = element('canvas');
  canvas.setAttribute('role', 'img');
  canvas.dataset['chart'] = 'monthly-seasonality';
  frame.append(canvas);
  host.append(frame);

  const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

  const chart = new Chart<'line', (number | null)[], string>(canvas, {
    type: 'line',
    data: {
      labels: monthLabels,
      datasets: [],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: matchMedia('(prefers-reduced-motion: reduce)').matches ? false : { duration: 500 },
      interaction: { intersect: false, mode: 'index' },
      plugins: {
        legend: {
          display: true,
          position: 'top',
          labels: {
            boxWidth: 12,
            font: { size: 11 },
          },
        },
        tooltip: {
          callbacks: {
            title: items => `Bulan: ${items[0]?.label ?? ''}`,
            label: item => {
              if (item.raw === null || item.raw === undefined) return `${item.dataset.label ?? ''}: Tidak ada data`;
              return `${item.dataset.label ?? ''}: ${number(Number(item.raw))} µg/m³`;
            },
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          title: { display: true, text: 'Bulan Kalender' },
        },
        y: {
          beginAtZero: true,
          title: { display: true, text: 'Konsentrasi (µg/m³)' },
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
    update: (data, mode) => {
      const pol = pollutant();
      const reference = REFERENCES[pol];
      canvas.setAttribute('aria-label', `Siklus musiman bulanan ${pol} Jan–Des`);

      if (chart.options.scales?.['y']?.title) {
        chart.options.scales['y'].title.text = `Konsentrasi ${pol} (µg/m³)`;
      }

      const refLine: ChartDataset<'line', (number | null)[]> = {
        label: `Baku Mutu PP 22/2021 (${reference.daily} µg/m³)`,
        data: monthLabels.map(() => reference.daily),
        borderColor: '#ef4444',
        borderDash: [5, 5],
        borderWidth: 1.5,
        pointRadius: 0,
        fill: false,
      };

      if (mode === 'years') {
        chart.data.datasets = [
          {
            label: '2024',
            data: data.map(d => d.y2024),
            borderColor: '#0284c7',
            backgroundColor: '#0284c7',
            borderWidth: 2,
            pointRadius: 4,
            tension: 0.15,
            fill: false,
          },
          {
            label: '2025',
            data: data.map(d => d.y2025),
            borderColor: '#ea580c',
            backgroundColor: '#ea580c',
            borderWidth: 2,
            pointRadius: 4,
            tension: 0.15,
            fill: false,
          },
          {
            label: '2026',
            data: data.map(d => d.y2026),
            borderColor: '#8b5cf6',
            backgroundColor: '#8b5cf6',
            borderWidth: 2,
            pointRadius: 4,
            tension: 0.15,
            fill: false,
          },
          refLine,
        ];
      } else {
        chart.data.datasets = [
          {
            label: 'Rentang Bawah (P25)',
            data: data.map(d => d.combinedP25),
            borderColor: 'transparent',
            backgroundColor: 'transparent',
            pointRadius: 0,
            fill: false,
          },
          {
            label: 'Rentang P25–P75',
            data: data.map(d => d.combinedP75),
            borderColor: 'transparent',
            backgroundColor: 'rgba(13, 148, 136, 0.2)',
            pointRadius: 0,
            fill: '-1',
          },
          {
            label: 'Median Gabungan',
            data: data.map(d => d.combinedMedian),
            borderColor: '#0d9488',
            backgroundColor: '#0d9488',
            borderWidth: 2.5,
            pointRadius: 4.5,
            tension: 0.15,
            fill: false,
          },
          refLine,
        ];
      }

      applyColors();
      lifecycle.refresh();
    },
    destroy: () => {
      lifecycle.destroy();
      frame.remove();
    },
  };
}

export function createEpisodeSeverityScatterChart(host: HTMLElement, pollutant: () => PollutantName): {
  update: (points: readonly EpisodeScatterPoint[]) => void;
  destroy: () => void;
} {
  const frame = element('div', 'episode-severity-plot analysis-plot');
  const canvas = element('canvas');
  canvas.setAttribute('role', 'img');
  canvas.dataset['chart'] = 'episode-severity';
  frame.append(canvas);
  host.append(frame);

  let currentPoints: readonly EpisodeScatterPoint[] = [];

  const chart = new Chart<'scatter', Array<{ x: number; y: number }>, string>(canvas, {
    type: 'scatter',
    data: {
      datasets: [{
        label: 'Episode Pelampauan',
        data: [],
        backgroundColor: [],
        borderColor: [],
        pointRadius: 5.5,
        pointHoverRadius: 8,
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
            title: items => {
              const idx = items[0]?.dataIndex ?? -1;
              const pt = currentPoints[idx];
              return pt ? `${pt.station} · ${pt.start} s.d. ${pt.end}` : '';
            },
            label: item => {
              const idx = item.dataIndex;
              const pt = currentPoints[idx];
              if (!pt) return '';
              return [
                `Durasi: ${number(pt.x)} hari beruntun`,
                `Konsentrasi Puncak: ${number(pt.y)} µg/m³`,
                `Rerata Episode: ${number(pt.mean)} µg/m³`,
              ];
            },
          },
        },
      },
      scales: {
        x: {
          beginAtZero: false,
          min: 1,
          title: { display: true, text: 'Durasi Episode (Hari Beruntun)' },
        },
        y: {
          beginAtZero: true,
          title: { display: true, text: 'Konsentrasi Puncak (µg/m³)' },
        },
      },
    },
  });

  const applyColors = (): void => {
    const theme = chartTheme();
    if (chart.options.scales?.['x']?.ticks) chart.options.scales['x'].ticks.color = theme.text;
    if (chart.options.scales?.['x']?.grid) chart.options.scales['x'].grid.color = theme.grid;
    if (chart.options.scales?.['x']?.title) chart.options.scales['x'].title.color = theme.text;
    if (chart.options.scales?.['y']?.ticks) chart.options.scales['y'].ticks.color = theme.text;
    if (chart.options.scales?.['y']?.grid) chart.options.scales['y'].grid.color = theme.grid;
    if (chart.options.scales?.['y']?.title) chart.options.scales['y'].title.color = theme.text;
  };

  const lifecycle = manageChart(chart, applyColors);

  return {
    update: points => {
      currentPoints = points;
      const pol = pollutant();
      const reference = REFERENCES[pol];
      canvas.setAttribute('aria-label', `Matriks keparahan episode pelampauan ${pol}; durasi vs puncak konsentrasi.`);

      if (chart.options.scales?.['y']?.title) {
        chart.options.scales['y'].title.text = `Puncak ${pol} (µg/m³) · acuan ${reference.daily} µg/m³`;
      }

      const colors = points.map(pt =>
        pt.x > 30 ? 'rgba(239, 68, 68, 0.75)' : pt.x > 10 ? 'rgba(234, 88, 12, 0.75)' : 'rgba(2, 132, 199, 0.75)'
      );
      const borderColors = points.map(pt =>
        pt.x > 30 ? '#dc2626' : pt.x > 10 ? '#c2410c' : '#0369a1'
      );

      const ds = chart.data.datasets[0];
      if (ds) {
        ds.data = points.map(pt => ({ x: pt.x, y: pt.y }));
        ds.backgroundColor = colors;
        ds.borderColor = borderColors;
      }

      applyColors();
      lifecycle.refresh();
    },
    destroy: () => {
      lifecycle.destroy();
      frame.remove();
    },
  };
}
