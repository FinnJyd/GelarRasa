import { Chart, BarController, BarElement, CategoryScale, LinearScale, Tooltip } from 'chart.js';
import { chartTheme, manageChart } from '../../shared/chart-lifecycle';
import { element, emptyState, button } from '../../shared/dom';
import { number } from '../../shared/format';
import { parseNetwork, rankNetwork } from './network';
import type { NetworkSite } from './network';
import type { PolicySummary } from './types';
Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip);
let cache: readonly NetworkSite[] | null = null;
export function mountNetworkRank(host: HTMLElement, catalogCodes: readonly string[]): { update: (summary: PolicySummary) => void; destroy: () => void } {
  const controller = new AbortController(), root = element('div', 'case-network'); host.append(root);
  let data: readonly NetworkSite[] | null = null, summary: PolicySummary | null = null;
  let chart: Chart<'bar', number[], string> | null = null, lifecycle: ReturnType<typeof manageChart> | null = null;
  const controls = element('div', 'case-weight-controls'), note = element('p', 'panel-footnote'); note.setAttribute('role', 'status');
  const inputs = ['Baseline PM2.5', 'Lalu lintas', 'Jarak antarstasiun'].map((name, i) => {
    const field = element('div', 'filter-field'), label = element('label', '', `Bobot ${name}`); label.htmlFor = `network-weight-${i}`;
    const input = element('input'); input.id = label.htmlFor; input.type = 'range'; input.min = '0'; input.max = '100'; input.value = '33'; const output = element('output'); output.htmlFor = input.id;
    field.append(label, output, input); controls.append(field); input.addEventListener('input', render, { signal: controller.signal }); return { input, output };
  });
  const frame = element('div', 'case-rank-chart'), canvas = element('canvas'); canvas.dataset['chart'] = 'policy-network-rank'; canvas.setAttribute('role', 'img'); frame.append(canvas);
  function render(): void {
    if (!data || !summary || !chart) return;
    const weights = inputs.map(({ input }) => Number(input.value)); inputs.forEach(({ output }, i) => { output.textContent = String(weights[i]); });
    const ranked = rankNetwork(data, summary.rows.map(row => row.station.code), weights), top = ranked.slice(0, 10);
    chart.data.labels = top.map(row => row.site.code.replace('AQMS-', '')); const dataset = chart.data.datasets[0]; if (dataset) dataset.data = top.map(row => row.score);
    frame.hidden = !top.length; frame.style.height = `${Math.max(180, top.length * 34 + 40)}px`;
    note.textContent = top.length ? `${top.length} dari ${ranked.length} wilayah stasiun ditampilkan. Skor 0–100 memakai normalisasi min–maks seluruh katalog, lalu rata-rata berbobot. Baseline PM2.5 berasal dari master, bukan pengamatan periode pilihan. Kandidat adalah wilayah studi penempatan; tidak ada koordinat alat baru.` : 'Tidak ada skor: pilih lokasi atau berikan setidaknya satu bobot positif.';
    canvas.setAttribute('aria-label', `Prioritas studi ekspansi. ${ranked.map(row => `${row.site.code}: skor ${number(row.score)}, baseline ${number(row.site.baseline)} µg/m³, lalu lintas ${number(row.site.traffic)}/jam, jarak ${number(row.site.nearestKm)} km`).join('; ')}`);
    chart.resize(); lifecycle?.refresh();
  }
  async function load(): Promise<void> {
    root.replaceChildren(emptyState('Memuat atribut jaringan…', 'Menyiapkan baseline, lalu lintas, dan jarak sumber.'));
    try {
      if (!cache) { const response = await fetch('./data/network_rank.json', { signal: controller.signal }); if (!response.ok) throw new Error('Ekspor jaringan tidak tersedia.'); cache = parseNetwork(await response.json()); }
      if (controller.signal.aborted) return; data = cache;
      if (data.length !== catalogCodes.length || catalogCodes.some(code => !data?.some(site => site.code === code))) throw new Error('Dimensi jaringan tidak sesuai.'); root.replaceChildren(controls, frame, note);
      chart = new Chart(canvas, { type: 'bar', data: { labels: [], datasets: [{ label: 'Skor studi ekspansi', data: [], borderRadius: 4 }] }, options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, animation: matchMedia('(prefers-reduced-motion: reduce)').matches ? false : { duration: 800 }, plugins: { legend: { display: false } }, scales: { x: { min: 0, max: 100 }, y: { ticks: { autoSkip: false } } } } });
      lifecycle = manageChart(chart, () => { const theme = chartTheme(); const dataset = chart?.data.datasets[0]; if (dataset) dataset.backgroundColor = theme.accent; for (const scale of Object.values(chart?.options.scales ?? {})) { if (scale?.ticks) scale.ticks.color = theme.text; if (scale?.grid) scale.grid.color = theme.grid; } }); render();
    } catch { lifecycle?.destroy(); lifecycle = null; chart = null; data = null; cache = null; if (!controller.signal.aborted) { const failure = emptyState('Peringkat belum tersedia', 'Periksa ekspor atribut jaringan.'); const retry = button('Coba lagi jaringan'); retry.addEventListener('click', () => { void load(); }, { once: true, signal: controller.signal }); failure.append(retry); root.replaceChildren(failure); } }
  }
  void load(); return { update: next => { summary = next; render(); }, destroy: () => { controller.abort(); lifecycle?.destroy(); root.remove(); } };
}
