import {
  ArcElement, BarController, BarElement, CategoryScale, Chart,
  DoughnutController, LinearScale, Tooltip,
} from 'chart.js';
import type { Plugin } from 'chart.js';
import type { Category, Station } from '../data/types';
import { element, emptyState } from './dom';
import { number, shortCity } from './format';
import { categoryColors } from './palette';
import { chartTheme, manageChart } from './chart-lifecycle';

Chart.register(ArcElement, BarController, BarElement, CategoryScale, DoughnutController, LinearScale, Tooltip);
Chart.defaults.font.family = 'Inter, sans-serif';
Chart.defaults.font.size = 12;

export interface Distribution {
  category: Category;
  count: number;
}

const valuesOnBars: Plugin<'bar'> = {
  id: 'values-on-bars',
  afterDatasetsDraw: chart => {
    const { ctx } = chart;
    const dataset = chart.data.datasets[0];
    if (!dataset) return;
    ctx.save();
    ctx.font = '600 12px Inter, sans-serif';
    ctx.fillStyle = chartTheme().text;
    ctx.textBaseline = 'middle';
    chart.getDatasetMeta(0).data.forEach((bar, index) => {
      const value = dataset.data[index];
      if (typeof value !== 'number') return;
      ctx.fillText(number(value), bar.x + 8, bar.y);
    });
    ctx.restore();
  },
};

export function createRankingChart(host: HTMLElement, name: string): {
  update: (stations: readonly Station[], maximum: number) => void;
  destroy: () => void;
} {
  let stations: readonly Station[] = [];
  const frame = element('div', 'ranking-plot');
  const canvas = element('canvas');
  canvas.setAttribute('role', 'img');
  canvas.dataset['chart'] = 'ranking';
  const accessible = element('ol', 'sr-only ranking-data');
  const empty = emptyState('Akhir peringkat', 'Semua stasiun pilihan sudah ditampilkan.');
  frame.append(canvas);
  host.append(frame, accessible, empty);
  const chart = new Chart<'bar', number[], string>(canvas, {
    type: 'bar',
    data: {
      labels: [],
      datasets: [{ data: [], borderRadius: 5, borderSkipped: false, barThickness: 13 }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: 'y',
      animation: matchMedia('(prefers-reduced-motion: reduce)').matches
        ? false : { duration: 900, easing: 'easeOutQuart' },
      layout: { padding: { right: 45, top: 2 } },
      plugins: {
        tooltip: {
          displayColors: false,
          callbacks: {
            title: items => stations[items[0]?.dataIndex ?? -1]?.city ?? '',
            label: item => `${number(Number(item.raw))} µg/m³`,
            afterLabel: item => stations[item.dataIndex]?.code ?? '',
          },
        },
      },
      scales: {
        x: { beginAtZero: true, grid: { drawTicks: false }, border: { display: false }, ticks: { maxTicksLimit: 4 } },
        y: {
          afterFit: scale => { scale.width = scale.chart.width < 340 ? 100 : 130; },
          grid: { display: false }, border: { display: false },
          ticks: {
            autoSkip: false,
            callback: function (_value, index) {
              const station = stations[index];
              if (!station) return '';
              const city = shortCity(station.city);
              const limit = this.chart.width < 340 ? 14 : 22;
              return [city.length > limit ? `${city.slice(0, limit - 1)}…` : city, station.code.replace('AQMS-', '')];
            },
          },
        },
      },
    },
    plugins: [valuesOnBars],
  });
  const lifecycle = manageChart(chart, () => {
    const theme = chartTheme();
    const x = chart.options.scales?.['x'];
    const y = chart.options.scales?.['y'];
    if (x?.ticks) x.ticks.color = theme.text;
    if (x?.grid) x.grid.color = theme.grid;
    if (y?.ticks) y.ticks.color = theme.text;
    const dataset = chart.data.datasets[0];
    if (dataset) dataset.backgroundColor = theme.accent;
  });
  return {
    update: (selected, maximum) => {
      stations = selected;
      frame.hidden = selected.length === 0;
      empty.hidden = selected.length !== 0;
      frame.style.height = `${Math.max(130, stations.length * 36 + 35)}px`;
      canvas.setAttribute('aria-label', `${name}. ${selected.map(item => `${shortCity(item.city)}: ${number(item.average)} µg/m³`).join('; ')}`);
      accessible.replaceChildren(...stations.map(station => element('li', '', `${station.code}: ${number(station.average)} µg/m³`)));
      chart.data.labels = stations.map(station => station.code);
      const dataset = chart.data.datasets[0];
      if (dataset) dataset.data = stations.map(station => station.average);
      const x = chart.options.scales?.['x'];
      if (x) x.max = Math.max(10, maximum);
      chart.resize();
      lifecycle.refresh();
    },
    destroy: () => { lifecycle.destroy(); host.replaceChildren(); },
  };
}

export function createDistributionChart(host: HTMLElement): {
  update: (distribution: readonly Distribution[], total: number) => void;
  destroy: () => void;
} {
  const root = element('div', 'distribution-visual');
  const plot = element('div', 'doughnut-plot');
  const canvas = element('canvas');
  canvas.dataset['chart'] = 'composition';
  canvas.setAttribute('role', 'img');
  const center = element('div', 'doughnut-center');
  const totalText = element('strong');
  center.append(totalText, element('span', '', 'stasiun'));
  center.setAttribute('aria-hidden', 'true');
  plot.append(canvas, center);
  const legend = element('ul', 'composition-legend');
  const empty = emptyState('Tidak ada stasiun', 'Ubah pilihan atau reset filter.');
  root.append(plot, legend, empty);
  host.append(root);
  const chart = new Chart<'doughnut', number[], string>(canvas, {
    type: 'doughnut',
    data: { labels: [], datasets: [{ data: [], hoverOffset: 7, spacing: 3, borderWidth: 0, borderRadius: 3 }] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '76%',
      animation: matchMedia('(prefers-reduced-motion: reduce)').matches
        ? false : { duration: 1000, animateRotate: true, animateScale: false, easing: 'easeOutQuart' },
      layout: { padding: 8 },
      plugins: {
        tooltip: {
          callbacks: {
            label: item => `${item.label}: ${number(Number(item.raw))} stasiun`,
          },
        },
      },
    },
  });
  const lifecycle = manageChart(chart, () => {
    if (chart.options.plugins?.tooltip) {
      chart.options.plugins.tooltip.titleFont = { family: 'Inter', size: 12 };
      chart.options.plugins.tooltip.bodyFont = { family: 'Inter', size: 12 };
    }
  });
  return {
    update: (distribution, total) => {
      const visible = distribution.filter(item => item.count > 0);
      plot.hidden = total === 0;
      legend.hidden = total === 0;
      empty.hidden = total !== 0;
      totalText.textContent = String(total);
      const description = visible.map(item => `${item.category}: ${item.count} stasiun`).join('; ');
      canvas.setAttribute('aria-label', `Komposisi kategori dominan. ${description}. Total ${total} stasiun.`);
      chart.data.labels = visible.map(item => item.category);
      const dataset = chart.data.datasets[0];
      if (dataset) {
        dataset.data = visible.map(item => item.count);
        dataset.backgroundColor = visible.map(item => categoryColors[item.category]);
      }
      legend.replaceChildren(...visible.map(item => {
        const row = element('li');
        const swatch = element('span', 'swatch');
        swatch.style.backgroundColor = categoryColors[item.category];
        swatch.setAttribute('aria-hidden', 'true');
        row.append(swatch, element('span', '', item.category), element('strong', '', String(item.count)),
          element('span', 'muted', `${Math.round(item.count / total * 100)}%`));
        return row;
      }));
      lifecycle.refresh();
    },
    destroy: () => { lifecycle.destroy(); host.replaceChildren(); },
  };
}
