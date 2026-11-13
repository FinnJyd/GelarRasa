import { BarController, BarElement, CategoryScale, Chart, LinearScale, PointElement, ScatterController, Tooltip } from 'chart.js';
import type { ChartDataset, Plugin, ScatterDataPoint } from 'chart.js';
import { element } from '../../shared/dom';
import { number } from '../../shared/format';
import { chartTheme, manageChart } from '../../shared/chart-lifecycle';
import type { PollutantName } from '../../data/types';
import { REFERENCES } from '../../shared/pollutants';

Chart.register(BarController, BarElement, CategoryScale, LinearScale, PointElement, ScatterController, Tooltip);

export interface BarSeries { label: string; values: readonly (number | null)[]; color: string | string[] }

export function barChart(host: HTMLElement, title: string, stacked = false, compact = false, grouped = false) {
  const frame = element('div', 'compliance-plot');
  const canvas = element('canvas');
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', title);
  const alternative = element('ul', 'sr-only');
  const valueLabels: Plugin<'bar'> = {
    id: 'compliance-bar-values',
    afterDatasetsDraw: chart => {
      if (stacked) return;
      if (grouped && chart.width < 480) return;
      const ctx = chart.ctx;
      ctx.save(); ctx.fillStyle = chartTheme().text; ctx.font = '600 11px Inter, sans-serif'; ctx.textBaseline = grouped ? 'bottom' : 'middle'; ctx.textAlign = grouped ? 'center' : 'left';
      chart.data.datasets.forEach((dataset, datasetIndex) => {
        chart.getDatasetMeta(datasetIndex).data.forEach((bar, index) => {
          const value = dataset.data[index];
          if (typeof value === 'number') ctx.fillText(number(value), grouped ? bar.x : bar.x + 7, grouped ? bar.y - 4 : bar.y);
        });
      });
      ctx.restore();
    },
  };
  frame.append(canvas);
  host.append(frame, alternative);
  const chart = new Chart<'bar', (number | null)[], string>(canvas, {
    type: 'bar', data: { labels: [], datasets: [] },
    options: {
      responsive: true, maintainAspectRatio: false, indexAxis: grouped ? 'x' : 'y',
      animation: false,
      layout: { padding: { right: stacked || grouped ? 0 : 38, top: grouped ? 16 : 0 } },
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: item => `${item.dataset.label}: ${number(Number(item.raw))}` } } },
      scales: {
        x: grouped ? { type: 'category', grid: { display: false }, border: { display: false }, ticks: { autoSkip: false, maxRotation: 0, font: { size: 11 } } }
          : { beginAtZero: true, stacked, ticks: { maxTicksLimit: 5 }, border: { display: false } },
        y: grouped ? { type: 'linear', beginAtZero: true, border: { display: false }, ticks: { maxTicksLimit: 4, callback: value => `${value}%` } }
          : { stacked, grid: { display: false }, border: { display: false }, ticks: { autoSkip: false, font: { size: 11 } } },
      },
    }, plugins: [valueLabels],
  });
  const lifecycle = manageChart(chart, () => {
    const theme = chartTheme();
    const x = chart.options.scales?.['x'];
    const y = chart.options.scales?.['y'];
    if (x?.ticks) x.ticks.color = theme.text;
    if (y?.ticks) y.ticks.color = theme.text;
    if (x?.grid) x.grid.color = theme.grid;
    if (y?.grid) y.grid.color = theme.grid;
  });
  return {
    update: (labels: string[], datasets: BarSeries[], maximum?: number): void => {
      frame.hidden = !labels.length;
      frame.style.height = `${grouped ? 160 : Math.max(compact ? 120 : 160, labels.length * (compact ? 22 : stacked ? 28 : 34) + (compact ? 40 : 45))}px`;
      chart.data.labels = labels;
      chart.data.datasets = datasets.map<ChartDataset<'bar', (number | null)[]>>(series => ({
        label: series.label, data: [...series.values], backgroundColor: series.color,
        borderRadius: stacked ? 0 : 4, borderSkipped: false, maxBarThickness: stacked ? 17 : compact ? 12 : 14,
      }));
      const x = chart.options.scales?.[grouped ? 'y' : 'x'];
      if (x) { if (maximum === undefined) delete x.max; else x.max = maximum; }
      alternative.replaceChildren(...labels.map((label, i) => element('li', '', `${label}: ${datasets.map(series => `${series.label} ${series.values[i] === null ? 'tidak tersedia' : number(series.values[i] ?? 0)}`).join('; ')}`)));
      canvas.setAttribute('aria-label', `${title}. ${labels.length} kelompok; nilai tersedia pada alternatif teks grafik dan tabel.`);
      chart.resize();
      lifecycle.refresh();
    },
    destroy: () => { lifecycle.destroy(); frame.remove(); alternative.remove(); },
  };
}

export interface DotRow { code: string; mean: number; status: string; color: string; coverage: string }
export function annualChart(host: HTMLElement) {
  const frame = element('div', 'compliance-plot');
  const canvas = element('canvas');
  const alternative = element('ul', 'sr-only');
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Rata-rata tahunan per stasiun; nilai dan kelengkapan tersedia di tabel.');
  frame.append(canvas);
  host.append(frame, alternative);
  let rows: readonly DotRow[] = [];
  let pollutant: PollutantName = 'PM2.5';
  const referenceLines: Plugin<'scatter'> = {
    id: 'compliance-reference-lines',
    afterDraw: chart => {
      const scale = chart.scales['x'];
      if (!scale) return;
      const ctx = chart.ctx;
      ctx.save();
      ctx.strokeStyle = chartTheme().text;
      ctx.setLineDash([4, 4]);
      for (const reference of [REFERENCES[pollutant].whoAnnual, REFERENCES[pollutant].annual]) {
        if (reference === null) continue;
        const x = scale.getPixelForValue(reference);
        ctx.beginPath(); ctx.moveTo(x, chart.chartArea.top); ctx.lineTo(x, chart.chartArea.bottom); ctx.stroke();
      }
      ctx.restore();
    },
  };
  const chart = new Chart<'scatter', ScatterDataPoint[], string>(canvas, {
    type: 'scatter', data: { labels: [], datasets: [{ data: [], pointRadius: 5, pointHoverRadius: 7 }] },
    options: {
      responsive: true, maintainAspectRatio: false, animation: false,
      plugins: { legend: { display: false }, tooltip: { callbacks: {
        label: item => { const row = rows[item.dataIndex]; return row ? `${row.code}: ${number(row.mean)} µg/m³ · ${row.status}` : ''; },
        afterLabel: item => rows[item.dataIndex]?.coverage ?? '',
      } } },
      scales: {
        x: { type: 'linear', beginAtZero: true, title: { display: true, text: 'PM2.5 (µg/m³)' }, ticks: { maxTicksLimit: 5 } },
        y: { type: 'category', offset: true, grid: { display: false }, ticks: { autoSkip: false, font: { size: 11 } } },
      },
    }, plugins: [referenceLines],
  });
  const lifecycle = manageChart(chart, () => {
    const theme = chartTheme();
    for (const axis of ['x', 'y']) {
      const scale = chart.options.scales?.[axis];
      if (scale?.ticks) scale.ticks.color = theme.text;
      if (scale?.grid) scale.grid.color = theme.grid;
      if (scale?.title) scale.title.color = theme.text;
    }
  });
  return {
    update: (selected: readonly DotRow[], selectedName: PollutantName): void => {
      rows = selected;
      pollutant = selectedName;
      alternative.replaceChildren(...rows.map(row => element('li', '', `${row.code}: ${number(row.mean)} µg/m³ · ${row.status} · ${row.coverage}`)));
      canvas.setAttribute('aria-label', `Rata-rata tahunan ${pollutant} pada ${rows.length} stasiun; nilai dan kelengkapan tersedia di tabel.`);
      frame.hidden = !rows.length;
      frame.style.height = `${Math.max(180, rows.length * 30 + 65)}px`;
      chart.data.labels = rows.map(row => row.code.replace('AQMS-', ''));
      const dataset = chart.data.datasets[0];
      if (dataset) {
        dataset.data = rows.map((row, i) => ({ x: row.mean, y: i }));
        dataset.pointBackgroundColor = rows.map(row => row.color);
        dataset.pointBorderColor = rows.map(row => row.color);
      }
      const x = chart.options.scales?.['x'];
      if (x) { x.max = Math.max(20, (REFERENCES[pollutant].annual ?? 0) * 1.15, ...rows.map(row => row.mean * 1.15)); if (x.title) x.title.text = `${pollutant} (µg/m³)`; }
      chart.resize(); lifecycle.refresh();
    },
    destroy: () => { lifecycle.destroy(); frame.remove(); alternative.remove(); },
  };
}
