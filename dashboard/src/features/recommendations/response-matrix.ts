import type { FilterState } from '../../data/types';
import { loadHealthEvidence, responseMatrix } from '../health';
import { element, emptyState, button } from '../../shared/dom';
import { number } from '../../shared/format';
import type { PolicySummary } from './types';

export function mountResponseMatrix(host: HTMLElement): { update: (summary: PolicySummary, filters: FilterState) => void; destroy: () => void } {
  const controller = new AbortController(), root = element('div'); host.append(root);
  let data: Awaited<ReturnType<typeof loadHealthEvidence>> | null = null, state: FilterState | null = null, summary: PolicySummary | null = null;
  function render(): void {
    if (!data || !state || !summary) return;
    const result = responseMatrix(data, summary.rows.map(row => row.station.code), state), frame = element('div', 'policy-table-wrap');
    const table = element('table', 'station-table'); table.append(element('caption', '', 'PM2.5 · perubahan kasus terhadap paparan rendah 2024 per faskes'));
    const head = element('thead'), tr = element('tr');
    for (const label of ['Kelompok paparan', 'Balita (%)', 'Lansia (%)', 'Bukti', 'Tindak lanjut']) { const th = element('th', '', label); th.scope = 'col'; tr.append(th); } head.append(tr);
    const body = element('tbody');
    for (const row of result.rows) { const tr = element('tr'); for (const label of [row.label, row.young === null ? '—' : number(row.young), row.older === null ? '—' : number(row.older), `${row.hospitals} faskes · ${row.pairs} faskes-hari`, row.action]) tr.append(element('td', '', label)); body.append(tr); }
    table.append(head, body); frame.append(table); frame.tabIndex = 0; frame.setAttribute('role', 'region'); frame.setAttribute('aria-label', 'Matriks respons historis kesehatan');
    root.replaceChildren(frame, element('p', 'panel-footnote', `${result.peaks.map(peak => `${peak.label}: ${peak.lag === null ? 'jeda belum tersedia' : `korelasi tertinggi lag ${peak.lag}, r=${number(peak.r ?? 0)}`}`).join(' · ')}. Rentang paparan relatif per stasiun, bukan batas bahaya atau peringatan klinis. Minimal 10 pasangan per kelompok; hasil deskriptif tanpa penyesuaian atau estimasi efek kebijakan. Model PM2.5 tidak mengikuti pilihan polutan lain.`));
  }
  async function load(): Promise<void> {
    root.replaceChildren(emptyState('Memuat sintesis kesehatan…', 'Menyiapkan bukti kelompok usia.'));
    try { data = await loadHealthEvidence(controller.signal); if (!controller.signal.aborted) render(); }
    catch { if (!controller.signal.aborted) { const failure = emptyState('Sintesis kesehatan tidak tersedia', 'Periksa ekspor kesehatan.'); const retry = button('Coba lagi sintesis'); retry.addEventListener('click', () => { void load(); }, { once: true, signal: controller.signal }); failure.append(retry); root.replaceChildren(failure); } }
  }
  void load(); return { update: (next, filters) => { summary = next; state = filters; render(); }, destroy: () => { controller.abort(); root.remove(); } };
}
