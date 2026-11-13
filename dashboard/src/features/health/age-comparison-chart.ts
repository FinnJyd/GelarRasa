import { BarController, BarElement, CategoryScale, Chart, Legend, LinearScale, Tooltip } from 'chart.js';
import { chartTheme, manageChart } from '../../shared/chart-lifecycle';
import { element, emptyState } from '../../shared/dom';
import { number } from '../../shared/format';
import type { AgeComparison, AgePoint } from './age-comparison';

Chart.register(BarController, BarElement, CategoryScale, Legend, LinearScale, Tooltip);

export function ageComparisonChart(host: HTMLElement) {
  const frame = element('div', 'health-plot');
  const canvas = element('canvas'); canvas.dataset['chart'] = 'health-age-comparison'; canvas.setAttribute('role', 'img');
  const alternative = element('ul', 'sr-only');
  const empty = emptyState('Data perbandingan umur belum mencukupi', 'Perluas periode atau pilih faskes dengan ≥30 hari berpasangan, lima kelompok paparan terisi, dan baseline kedua umur di atas nol.');
  frame.append(canvas); host.append(frame, empty, alternative);
  let points: readonly AgePoint[] = [];
  const chart = new Chart<'bar', number[], string>(canvas, {
    type: 'bar', data: { labels: [], datasets: [
      { label: 'Balita <5 tahun', data: [], backgroundColor: '#087f8c', borderRadius: 3, maxBarThickness: 30 },
      { label: 'Lansia >60 tahun', data: [], backgroundColor: '#d19a35', borderRadius: 3, maxBarThickness: 30 },
    ] },
    options: {
      responsive: true, maintainAspectRatio: false,
      animation: matchMedia('(prefers-reduced-motion: reduce)').matches ? false : { duration: 800 },
      interaction: { intersect: false, mode: 'index' },
      plugins: { legend: { display: true, labels: { boxWidth: 12, boxHeight: 12, font: { size: 11 } } },
        tooltip: { callbacks: {
          label: item => `${item.dataset.label}: ${number(Number(item.raw))}% terhadap rata-rata periode`,
          footer: items => { const point = points[items[0]?.dataIndex ?? -1]; return point ? `${number(point.days)} faskes-hari berpasangan\nRata-rata paparan: ${number(point.exposure)} µg/m³` : ''; },
        } } },
      scales: {
        x: { grid: { display: false }, title: { display: true, text: 'Paparan relatif per faskes: rendah → tinggi' }, ticks: { autoSkip: false } },
        y: { beginAtZero: true, title: { display: true, text: 'Perubahan admisi (%)' }, ticks: { maxTicksLimit: 5, callback: value => `${value}%` } },
      },
    },
  });
  const lifecycle = manageChart(chart, () => {
    const theme = chartTheme();
    const legend = chart.options.plugins?.legend;
    if (legend?.labels) legend.labels.color = theme.text;
    for (const axis of Object.values(chart.options.scales ?? {})) {
      if (axis?.ticks) axis.ticks.color = theme.text;
      if (axis?.grid) axis.grid.color = theme.grid;
      if (axis?.title) axis.title.color = theme.text;
    }
  });
  return {
    update(result: AgeComparison): void {
      points = result.points;
      frame.hidden = !points.length; empty.hidden = !!points.length;
      canvas.setAttribute('aria-label', `Perubahan admisi pernapasan balita dan lansia terhadap rata-rata periode. ${result.facilities} faskes, ${points.length} kelompok paparan.`);
      chart.data.labels = points.map(point => point.label);
      const young = chart.data.datasets[0], old = chart.data.datasets[1];
      if (young) young.data = points.map(point => point.under5);
      if (old) old.data = points.map(point => point.over60);
      alternative.replaceChildren(...points.map(point => element('li', '', `${point.label}: balita ${number(point.under5)}%; lansia ${number(point.over60)}%; ${number(point.days)} faskes-hari; paparan rata-rata ${number(point.exposure)} µg/m³.`)));
      chart.resize(); lifecycle.refresh();
    },
    destroy(): void { lifecycle.destroy(); frame.remove(); empty.remove(); alternative.remove(); },
  };
}
