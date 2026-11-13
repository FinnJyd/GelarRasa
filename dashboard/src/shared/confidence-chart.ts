import { Chart, LineController, LineElement, PointElement, CategoryScale, LinearScale, Filler, Tooltip } from 'chart.js';
import { chartTheme, manageChart } from './chart-lifecycle';
import { element } from './dom';
import { number } from './format';
Chart.register(LineController, LineElement, PointElement, CategoryScale, LinearScale, Filler, Tooltip);
export function confidenceChart(host: HTMLElement): { update: (labels: string[], values: readonly { mean: number; lower: number; upper: number }[]) => void; destroy: () => void } {
  const frame = element('div', 'health-plot'), canvas = element('canvas'); canvas.dataset['chart'] = 'policy-model-interval'; canvas.setAttribute('role', 'img'); frame.append(canvas); host.append(frame);
  const chart = new Chart<'line', number[], string>(canvas, { type: 'line', data: { labels: [], datasets: [
    { label: 'Batas bawah 95%', data: [], borderWidth: 0, pointRadius: 0 },
    { label: 'Batas atas 95%', data: [], borderWidth: 0, pointRadius: 0, fill: '-1' },
    { label: 'Rerata model', data: [], borderWidth: 2, pointRadius: 0 },
  ] }, options: { responsive: true, maintainAspectRatio: false, animation: matchMedia('(prefers-reduced-motion: reduce)').matches ? false : { duration: 800 },
    plugins: { legend: { display: false }, tooltip: { callbacks: { label: item => `${item.dataset.label}: ${number(Number(item.raw))}` } } },
    scales: { x: { title: { display: true, text: 'Rata-rata PM2.5 skenario (µg/m³)' }, ticks: { maxTicksLimit: 5, maxRotation: 0 } }, y: { beginAtZero: true, title: { display: true, text: 'Rerata admisi / hari' } } } } });
  const lifecycle = manageChart(chart, () => {
    const theme = chartTheme();
    chart.data.datasets.forEach(dataset => { dataset.borderColor = theme.accent; dataset.backgroundColor = `${theme.accent}33`; });
    for (const scale of Object.values(chart.options.scales ?? {})) { if (scale?.ticks) scale.ticks.color = theme.text; if (scale?.title) scale.title.color = theme.text; if (scale?.grid) scale.grid.color = theme.grid; }
  });
  return { update: (labels, values) => {
    frame.hidden = !values.length; chart.data.labels = labels;
    chart.data.datasets.forEach((dataset, i) => { dataset.data = values.map(value => i === 0 ? value.lower : i === 1 ? value.upper : value.mean); });
    canvas.setAttribute('aria-label', `Interval kepercayaan 95% rerata bersyarat. ${values.map((v, i) => `PM2.5 ${labels[i]}: ${number(v.mean)} (${number(v.lower)}–${number(v.upper)})`).join('; ')}`); lifecycle.refresh();
  }, destroy: () => { lifecycle.destroy(); frame.remove(); } };
}
