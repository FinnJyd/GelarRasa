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
  Tooltip,
} from 'chart.js';
import { chartTheme, manageChart } from '../../shared/chart-lifecycle';
import { manageCanvas } from '../../shared/canvas-lifecycle';
import { matrixLegend, matrixSurface } from '../../shared/matrix-surface';
import { element, emptyState } from '../../shared/dom';
import type { ChartDataset } from 'chart.js';
import { date, number } from '../../shared/format';
import type { EpisodeWithStation } from './model';

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
          },
        },
        tooltip: {
          displayColors: true,
          callbacks: {
            label: item => `${item.dataset.label ?? ''}: ${item.raw !== null ? number(Number(item.raw)) + ' µg/m³' : '—'}`,
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
          label: 'P25–P75',
          data: p25s,
          borderColor: 'transparent',
          backgroundColor: 'rgba(2, 132, 199, 0.16)',
          pointRadius: 0,
          borderWidth: 0,
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
  let maximum: number | null = null;
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
        ctx.fillStyle = value === null ? theme.grid : `rgba(2,132,199,${maximum ? .15+.85*value/maximum : .15})`;
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
      maximum = available.length ? Math.max(...available) : null;
      surface.legend.replaceChildren();
      matrixLegend(surface.legend, `${pollutant()} (µg/m³)`, [[maximum === null ? 'Tidak tersedia' : `0–${number(maximum)} · warna relatif`, '#0284c7']]);
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
  update: (dates: readonly string[], stations: Record<string, readonly (number | null)[]>, isCapped: boolean) => void;
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
          display: false,
          position: 'top',
          labels: {
            boxWidth: 14,
            font: { size: 12, family: 'Inter, sans-serif' },
            padding: 10,
          },
        },
        tooltip: {
          displayColors: true,
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
    update: (dates, stations, isCapped) => {
      canvas.setAttribute('aria-label', `Tren ${pollutant()} harian · ${Object.keys(stations).length} stasiun · ${isCapped ? 'fokus 0–150 µg/m³' : 'skala penuh'}.`);
      chart.data.labels = dates.map(date);
      if(chart.options.scales?.['y']?.title) chart.options.scales['y'].title.text = `Rata-rata harian ${pollutant()} (µg/m³)`;

      if (chart.options.scales?.['y']) {
        if (isCapped) {
          chart.options.scales['y'].max = 150;
        } else {
          chart.options.scales['y'].max = undefined;
        }
      }

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

      const reference = REFERENCES[pollutant()];
      if(reference.hours === 24) datasets.push({label:`PP harian · ${reference.daily} µg/m³`,data:dates.map(()=>reference.daily),borderColor:'#dc2626',borderDash:[6,4],pointRadius:0,borderWidth:2});
      if(reference.annual !== null) datasets.push({label:`PP tahunan · ${reference.annual} µg/m³ (konteks)`,data:dates.map(()=>reference.annual),borderColor:'#16a34a',borderDash:[4,4],pointRadius:0,borderWidth:1.5});

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
  };

  const lifecycle = manageChart(chart, applyColors);

  return {
    update: episodes => {
      currentEpisodes = episodes;
      const reference = REFERENCES[pollutant()];
      if(chart.options.scales?.['x']?.title) chart.options.scales['x'].title.text = `Durasi (hari >${reference.daily} µg/m³ · ${reference.hours} jam)`;
      frame.style.setProperty('--analysis-rows', String(episodes.length));
      canvas.setAttribute('aria-label', `Durasi ${episodes.length} episode ekstrem; nilai dan periode tersedia pada tooltip.`);
      chart.data.labels = episodes.map(ep => `${ep.station.replace('AQMS-', '')} · ${ep.start.slice(0, 7)}`);
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
