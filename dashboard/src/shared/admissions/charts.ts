import { BarController, BarElement, CategoryScale, Chart, LinearScale, Tooltip } from 'chart.js';
import { chartTheme, manageChart } from '../chart-lifecycle';
import { element } from '../dom';
import { number } from '../format';

Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip);
export function comparisonChart(host: HTMLElement, name: string): {
  comparison: (baseline: number | null, scenario: number | null, unit: string) => void; destroy: () => void;
} {
  const frame = element('div', 'admission-chart admission-comparison-chart');
  const canvas = element('canvas'); canvas.setAttribute('role', 'img'); canvas.dataset['chart'] = name;
  const alternative = element('p', 'sr-only'); frame.append(canvas); host.append(frame, alternative);
  const chart = new Chart<'bar', (number | null)[], string>(canvas, {
    type: 'bar', data: { labels: ['Historis', 'Skenario'], datasets: [{ label: name, data: [], borderRadius: 5, barThickness: 24 }] },
    options: { indexAxis: 'y', maintainAspectRatio: false, responsive: true,
      animation: matchMedia('(prefers-reduced-motion: reduce)').matches ? false : { duration: 800 },
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: item => `${item.dataset.label}: ${number(Number(item.raw))}` } } },
      scales: { x: { beginAtZero: true, border: { display: false }, ticks: { maxTicksLimit: 5 } },
        y: { border: { display: false }, grid: { display: false }, ticks: { autoSkip: false } } },
    },
  });
  const lifecycle = manageChart(chart, () => {
    const theme = chartTheme(), dataset = chart.data.datasets[0];
    if (dataset) dataset.backgroundColor = [theme.text, theme.accent];
    for (const scale of Object.values(chart.options.scales ?? {})) {
      if (scale?.ticks) scale.ticks.color = theme.text;
      if (scale?.grid) scale.grid.color = theme.grid;
    }
  });
  return {
    comparison: (baseline, scenario, unit) => {
      frame.hidden = baseline === null || scenario === null;
      const dataset = chart.data.datasets[0]; if (dataset) { dataset.data = [baseline, scenario]; dataset.label = unit; }
      const text = `${unit}: historis ${baseline === null ? 'tidak tersedia' : number(baseline)}, skenario ${scenario === null ? 'tidak tersedia' : number(scenario)}.`;
      canvas.setAttribute('aria-label', text); alternative.textContent = text; lifecycle.refresh();
    },
    destroy: () => { lifecycle.destroy(); frame.remove(); alternative.remove(); },
  };
}
