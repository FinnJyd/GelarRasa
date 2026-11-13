import { BarController, BarElement, CategoryScale, Chart, LinearScale, LineController, LineElement, PointElement, Tooltip } from 'chart.js';
import { chartTheme, manageChart } from '../../shared/chart-lifecycle';
import { element, emptyState } from '../../shared/dom';
import { number } from '../../shared/format';
import type { Series } from './types';

Chart.register(BarController, BarElement, CategoryScale, LinearScale, LineController, LineElement, PointElement, Tooltip);

export function healthPlot(host: HTMLElement, id: string, kind: 'line' | 'bar', axis: string, bounds?: { min: number; max: number }): {
  update: (labels: string[], values: Series, label: string, context?: readonly string[]) => void;
  destroy: () => void;
} {
  const frame = element('div', 'health-plot');
  const canvas = element('canvas');
  canvas.dataset['chart'] = id;
  canvas.setAttribute('role', 'img');
  const empty = emptyState('Data belum mencukupi', 'Ubah stasiun atau perluas periode untuk melihat analisis ini.');
  const summary = element('p', 'sr-only');
  frame.append(canvas);
  host.append(frame, empty, summary);
  let descriptions: readonly string[] = [];
  const chart = new Chart<'line' | 'bar', (number | null)[], string>(canvas, {
    type: kind,
    data: { labels: [], datasets: [{ label: '', data: [], borderWidth: kind === 'line' ? 2 : 0,
      pointRadius: id === 'health-lag' ? 4 : 0, pointHitRadius: 10,
      borderRadius: 5, spanGaps: false, tension: 0.15, maxBarThickness: 48 }] },
    options: {
      responsive: true, maintainAspectRatio: false,
      animation: matchMedia('(prefers-reduced-motion: reduce)').matches ? false : { duration: 800 },
      interaction: { intersect: false, mode: 'index' },
      plugins: {
        legend: { display: false },
        tooltip: { displayColors: false, callbacks: {
          label: item => `${item.dataset.label}: ${number(Number(item.raw))}`,
          afterLabel: item => descriptions[item.dataIndex] ?? '',
        } },
      },
      scales: {
        x: { grid: { display: false }, border: { display: false },
          title: { display: id === 'health-lag', text: 'Jeda (hari)' },
          ticks: { maxTicksLimit: id === 'health-lag' ? 8 : 6, autoSkip: !['health-lag', 'health-ages'].includes(id), autoSkipPadding: ['health-exposure', 'health-admissions', 'health-strain'].includes(id) ? 20 : 3, maxRotation: 0,
            callback(value) {
              const label = this.getLabelForValue(Number(value));
              return this.chart.width < 480 && ['health-exposure', 'health-admissions', 'health-strain'].includes(id)
                ? label.replace(/^\d+\s+/, '').replace(/20(\d{2})$/, '$1') : label;
            } } },
        y: { beginAtZero: true, ...(bounds ?? {}), border: { display: false },
          ticks: { maxTicksLimit: 5 }, title: { display: true, text: axis } },
      },
    },
  });
  // The shared lifecycle owns theme observation, live reduced-motion changes, and destruction.
  const lifecycle = manageChart(chart, () => {
    const theme = chartTheme();
    const dataset = chart.data.datasets[0];
    if (dataset) { dataset.borderColor = theme.accent; dataset.backgroundColor = theme.accent; }
    for (const scale of Object.values(chart.options.scales ?? {})) {
      if (scale?.ticks) scale.ticks.color = theme.text;
      if (scale?.grid) scale.grid.color = theme.grid;
      if (scale?.title) scale.title.color = theme.text;
    }
  });
  return {
    update: (labels, values, label, context = []) => {
      descriptions = context;
      const valid = values.filter((v): v is number => v !== null);
      const hasData = valid.length > 0;
      frame.hidden = !hasData;
      empty.hidden = hasData;
      canvas.setAttribute('aria-label', `${label}. ${valid.length} titik tersedia dari ${values.length}.`);
      summary.textContent = hasData
        ? `${label}: minimum ${number(Math.min(...valid))}, maksimum ${number(Math.max(...valid))}. ${values.length <= 12 ? values.map((value, index) => `${labels[index] ?? ''}: ${value === null ? 'tidak tersedia' : number(value)}; ${context[index] ?? ''}`).join('. ') : ''}`
        : `${label}: data belum mencukupi.`;
      chart.data.labels = labels;
      const dataset = chart.data.datasets[0];
      if (dataset) {
        dataset.data = [...values]; dataset.label = label;
        if ('pointRadius' in dataset) dataset.pointRadius = id === 'health-lag' ? values.map(value => value !== null && value === Math.max(...valid) ? 7 : 3) : valid.length <= 30 ? 3 : 0;
      }
      chart.resize();
      lifecycle.refresh();
    },
    destroy: () => { lifecycle.destroy(); frame.remove(); empty.remove(); summary.remove(); },
  };
}
