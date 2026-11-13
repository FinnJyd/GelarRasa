import type { FilterState } from '../../data/types';
import { button, element, emptyState } from '../../shared/dom';
import { number } from '../../shared/format';
import { confidenceChart } from '../../shared/confidence-chart';
import { expectedAdmissions, loadLagData, scenarioDomain } from '../../shared/lag-model';
import type { LagData } from '../../shared/lag-model';
import type { PolicySummary } from './types';

export function mountLagSimulator(host: HTMLElement): { update: (summary: PolicySummary, state: FilterState) => void; destroy: () => void } {
  const controller = new AbortController(), root = element('div', 'case-simulator'); host.append(root);
  let data: LagData | null = null, current: PolicySummary | null = null, filters: FilterState | null = null;
  let chart: ReturnType<typeof confidenceChart> | null = null, signature = '', target: 'young' | 'older' = 'young';
  const scope = element('p', 'panel-footnote'), warnings = element('p', 'health-quality'); warnings.setAttribute('role', 'status');
  const controls = element('div', 'case-model-controls');
  const concentrationField = element('div', 'filter-field'), label = element('label', '', 'Rata-rata PM2.5 skenario (µg/m³)'); label.htmlFor = 'model-pm25';
  const concentration = element('input'); concentration.id = 'model-pm25'; concentration.type = 'range'; concentration.step = 'any';
  const concentrationValue = element('output'); concentrationValue.htmlFor = concentration.id;
  concentrationField.append(label, concentrationValue, concentration);
  const bedsField = element('div', 'filter-field'), bedLabel = element('label', '', 'Tambahan tempat tidur skenario'); bedLabel.htmlFor = 'model-beds';
  const beds = element('input'); beds.id = 'model-beds'; beds.type = 'number'; beds.min = '0'; beds.max = '100000'; beds.step = '1'; beds.value = '0'; bedsField.append(bedLabel, beds);
  const reset = button('Reset model'); controls.append(concentrationField, bedsField, reset);
  const results = element('div', 'admission-simulation-results'), chartHost = element('div');
  const disease = element('div', 'segmented-control'); disease.setAttribute('role', 'group'); disease.setAttribute('aria-label', 'Kelompok pada grafik model');
  const young = button('Balita'), older = button('Lansia'); disease.append(young, older);
  const validation = element('details', 'policy-table-disclosure'), validationSummary = element('summary', '', 'Validasi model: latih 2024–2025, uji 2026'), validationBody = element('div', 'policy-table-body'); validation.append(validationSummary, validationBody);
  function render(): void {
    if (!data || !current || !filters) return;
    const mode = data.models[filters.includeSuspect ? 's' : 'v'], domain = scenarioDomain(mode, current.rows.map(row => row.station.code));
    results.replaceChildren();
    const next = `${filters.includeSuspect}:${domain?.codes.join(',') ?? ''}`;
    if (next !== signature && domain) { concentration.min = String(domain.min); concentration.max = String(domain.max); concentration.value = String(domain.reference); signature = next; }
    const pm = Number(concentration.value), extra = beds.value === '' ? NaN : Number(beds.value), validBeds = Number.isSafeInteger(extra) && extra >= 0 && extra <= 100000;
    beds.setAttribute('aria-invalid', String(!validBeds)); concentration.disabled = domain === null;
    concentrationValue.textContent = domain ? `${number(pm)} µg/m³ · referensi ${number(domain.reference)}` : 'Paparan model tidak tersedia';
    const available = domain && current.dates.length && validBeds && pm >= domain.min - 1e-8 && pm <= domain.max + 1e-8;
    const a = available ? expectedAdmissions(mode.outcomes.young, domain.codes, pm - domain.reference) : null;
    const b = available ? expectedAdmissions(mode.outcomes.older, domain.codes, pm - domain.reference) : null;
    for (const [name, prediction] of [['Balita <5 tahun', a], ['Lansia >60 tahun', b]] as const) {
      const card = element('article', 'admission-result'), value = element('output', 'admission-result-value', prediction ? number(prediction.mean) : '—');
      value.setAttribute('aria-label', `Estimasi admisi ${name}`);
      value.dataset['modelResult'] = name.startsWith('Balita') ? 'young' : 'older'; if (prediction) value.dataset['value'] = String(prediction.mean);
      card.append(element('h4', '', name), value, element('p', '', prediction ? `admisi/hari · IK 95% ${number(prediction.lower)}–${number(prediction.upper)}` : 'Data atau asumsi belum mencukupi')); results.append(card);
    }
    const load = element('article', 'admission-result');
    load.append(element('h4', '', 'Beban admisi dua kelompok'), element('output', 'admission-result-value', a && b && domain ? number((a.mean + b.mean) / (domain.beds + extra) * 100) : '—'), element('p', '', 'admisi/100 tempat tidur/hari · bukan keterisian')); if (domain && validBeds) load.append(element('p', '', `${number(domain.beds)} + ${number(extra)} = ${number(domain.beds + extra)} tempat tidur pada ${domain.codes.length} faskes model.`)); results.append(load);
    scope.textContent = `${domain?.codes.length ?? 0}/${current.rows.length} faskes pilihan memiliki model. PM2.5 lag 0–7, suhu, kelembapan, hari, musim, waktu, dan efek tetap faskes. Profil acuan dari data latih; tanggal pilihan memperbarui bukti observasi, bukan melatih ulang model.`;
    warnings.textContent = !validBeds ? 'Tambahan tempat tidur harus bilangan bulat 0–100.000.' : !domain ? 'Model belum tersedia untuk faskes pilihan; satuan atau rangkaian paparan tidak mencukupi.' : 'Estimasi berdasarkan pola historis dataset. Model gagal menggeneralisasi episode 2026 di luar rentang latih; skenario dibatasi pada rentang tiap faskes. Pita adalah IK 95% rerata bersyarat, bukan interval jumlah pasien aktual atau bukti efek kebijakan.';
    young.setAttribute('aria-pressed', String(target === 'young')); older.setAttribute('aria-pressed', String(target === 'older'));
    const points = domain && a && b ? Array.from({ length: 11 }, (_, i) => domain.min + (domain.max - domain.min) * i / 10) : [];
    const values = domain ? points.flatMap(value => { const prediction = expectedAdmissions(mode.outcomes[target], domain.codes, value - domain.reference); return prediction ? [prediction] : []; }) : [];
    chart?.update(values.length === points.length ? points.map(value => number(value)) : [], values.length === points.length ? values : []);
    validationBody.replaceChildren();
    for (const [name, fit] of [['Balita', mode.outcomes.young], ['Lansia', mode.outcomes.older]] as const) {
      validationBody.append(element('p', 'panel-footnote', `${name}: ${fit.trainRows} baris latih, ${fit.testRows} baris uji. Satuan galat: admisi/faskes-hari. Seluruh uji: MAE ${number(fit.test.mae)}, RMSE ${number(fit.test.rmse)}; pembanding tanpa PM2.5: MAE ${number(fit.baseline.mae)}, RMSE ${number(fit.baseline.rmse)}. Dalam rentang latih: ${fit.supportedTestRows} baris, MAE ${number(fit.supportedTest.mae)}, RMSE ${number(fit.supportedTest.rmse)}. Di luar rentang: ${fit.excludedTestRows} baris, tetap masuk evaluasi penuh.`));
    }
  }
  async function load(): Promise<void> {
    root.replaceChildren(emptyState('Menyiapkan model lag…', 'Memuat koefisien dan hasil validasi temporal.'));
    try {
      data = await loadLagData(controller.signal); if (controller.signal.aborted) return;
      root.replaceChildren(scope, controls, results, warnings, disease, chartHost, validation); chart = confidenceChart(chartHost); render();
    } catch { chart?.destroy(); chart = null; if (!controller.signal.aborted) {
      const failure = emptyState('Model belum tersedia', 'Bukti kebijakan dan perhitungan kapasitas manual tetap tersedia.');
      const retry = button('Coba lagi model'); retry.addEventListener('click', () => { void load(); }, { once: true, signal: controller.signal }); failure.append(retry); root.replaceChildren(failure);
    } }
  }
  const listen = { signal: controller.signal };
  concentration.addEventListener('input', render, listen); beds.addEventListener('input', render, listen);
  reset.addEventListener('click', () => { signature = ''; beds.value = '0'; render(); }, listen);
  young.addEventListener('click', () => { target = 'young'; render(); }, listen); older.addEventListener('click', () => { target = 'older'; render(); }, listen);
  void load(); return { update: (summary, state) => { current = summary; filters = state; render(); }, destroy: () => { controller.abort(); chart?.destroy(); root.remove(); } };
}
