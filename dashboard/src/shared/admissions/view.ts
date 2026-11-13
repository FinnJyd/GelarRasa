import { button, element } from '../dom';
import { number } from '../format';
import { comparisonChart } from './charts';
import { simulate } from './model';
import type { AdmissionBaseline, ScenarioInput } from './types';

export function mountSimulation(host: HTMLElement): { update: (summary: AdmissionBaseline) => void; destroy: () => void } {
  const controller = new AbortController();
  let current: AdmissionBaseline | null = null;
  let baseline: ScenarioInput['baseline'] = 'mean';
  const root = element('div', 'admission-simulation');
  const controls = element('div', 'admission-simulation-controls');
  const baselineControl = element('div', 'filter-field');
  baselineControl.append(element('span', 'field-label', 'Dasar historis'));
  const group = element('div', 'segmented-control'); group.setAttribute('role', 'group'); group.setAttribute('aria-label', 'Statistik dasar historis');
  const average = button('Rata-rata'), p90 = button('P90'); group.append(average, p90); baselineControl.append(group);
  const increaseField = element('div', 'filter-field');
  const increaseLabel = element('label', '', 'Kenaikan admisi (%)'); increaseLabel.htmlFor = 'admission-increase';
  const increase = element('input'); increase.type = 'number'; increase.min = '0'; increase.max = '200'; increase.step = 'any'; increase.value = '0'; increase.id = 'admission-increase';
  increaseField.append(increaseLabel, increase);
  const bedsField = element('div', 'filter-field');
  const bedsLabel = element('label', '', 'Tambahan tempat tidur'); bedsLabel.htmlFor = 'admission-extra-beds';
  const beds = element('input'); beds.type = 'number'; beds.min = '0'; beds.max = '100000'; beds.step = '1'; beds.value = '0'; beds.id = 'admission-extra-beds';
  bedsField.append(bedsLabel, beds);
  const reset = button('Reset skenario', 'button button-subtle');
  controls.append(baselineControl, increaseField, bedsField, reset);
  const cards = element('div', 'admission-simulation-results');
  const makeResult = (label: string, name: string, unit: string): { value: HTMLOutputElement; context: HTMLElement } => {
    const card = element('article', 'admission-result');
    const value = element('output', 'admission-result-value', '—'); value.dataset['result'] = name; value.setAttribute('aria-label', label);
    const context = element('p', 'muted');
    card.append(element('h4', '', label), value, element('span', 'admission-result-unit', unit), context); cards.append(card);
    return { value, context };
  };
  const historical = makeResult('Admisi historis', 'baseline', 'admisi / hari');
  const projected = makeResult('Admisi skenario', 'admissions', 'admisi / hari');
  const load = makeResult('Beban relatif skenario', 'load', 'admisi / 100 tempat tidur / hari');
  const message = element('p', 'admission-scenario-message'); message.setAttribute('role', 'status');
  const equation = element('p', 'admission-equation');
  const comparisons = element('div', 'admission-comparison-grid');
  const admissionsHost = element('div'), loadHost = element('div');
  admissionsHost.append(element('h4', 'admission-small-heading', 'Admisi per hari')); loadHost.append(element('h4', 'admission-small-heading', 'Admisi per 100 tempat tidur per hari'));
  comparisons.append(admissionsHost, loadHost);
  root.append(controls, cards, message, comparisons, equation,
    element('p', 'panel-footnote', 'Asumsi perencanaan, bukan prediksi polusi atau tingkat keterisian. Rentang input: kenaikan 0–200%, tambahan 0–100.000 tempat tidur; batas ini hanya batas kontrol. Polutan dan QC tidak mengubah dasar admisi.'));
  host.append(root);
  const admissionsChart = comparisonChart(admissionsHost, 'admission-scenario-admissions');
  const loadChart = comparisonChart(loadHost, 'admission-scenario-load');
  function render(): void {
    average.setAttribute('aria-pressed', String(baseline === 'mean')); p90.setAttribute('aria-pressed', String(baseline === 'p90'));
    const delta = increase.value === '' ? NaN : Number(increase.value);
    const extra = beds.value === '' ? NaN : Number(beds.value);
    const validDelta = Number.isFinite(delta) && delta >= 0 && delta <= 200;
    const validBeds = Number.isInteger(extra) && extra >= 0 && extra <= 100000;
    increase.setAttribute('aria-invalid', String(!validDelta)); beds.setAttribute('aria-invalid', String(!validBeds));
    const scenario = current ? simulate(current, { baseline, increase: delta, extraBeds: extra }) : null;
    for (const output of [historical.value, projected.value, load.value]) { output.textContent = '—'; delete output.dataset['value']; }
    historical.context.textContent = baseline === 'mean' ? 'Rata-rata total harian faskes pilihan' : 'P90 total harian faskes pilihan';
    if (!scenario) {
      message.textContent = !validDelta || !validBeds ? 'Perbaiki asumsi: kenaikan 0–200% dan tambahan tempat tidur bilangan bulat 0–100.000.' : 'Data admisi atau kapasitas pada pilihan ini belum mencukupi.';
      projected.context.textContent = ''; load.context.textContent = ''; equation.textContent = '';
      admissionsChart.comparison(null, null, 'Admisi / hari'); loadChart.comparison(null, null, 'Admisi / 100 tempat tidur / hari'); return;
    }
    const values: [HTMLOutputElement, number][] = [[historical.value, scenario.baseline], [projected.value, scenario.admissions], [load.value, scenario.load]];
    for (const [output, value] of values) { output.textContent = number(value); output.dataset['value'] = String(value); }
    projected.context.textContent = `Asumsi kenaikan ${number(delta)}%`;
    load.context.textContent = `${number(scenario.baselineCapacity)} + ${number(extra)} = ${number(scenario.capacity)} tempat tidur skenario`;
    message.textContent = `Skenario memakai ${current?.facilities ?? 0} faskes dan ${current?.days ?? 0} hari dengan data lengkap. Nol asumsi menghasilkan nilai historis yang sama.`;
    equation.textContent = `${number(scenario.baseline)} × (1 + ${number(delta)} / 100) = ${number(scenario.admissions)} admisi/hari. Beban = ${number(scenario.admissions)} ÷ ${number(scenario.capacity)} × 100 = ${number(scenario.load)}. Perhitungan memakai presisi penuh; tampilan dibulatkan.`;
    admissionsChart.comparison(scenario.baseline, scenario.admissions, 'Admisi / hari');
    loadChart.comparison(scenario.baselineLoad, scenario.load, 'Admisi / 100 tempat tidur / hari');
  }
  for (const [node, value] of [[average, 'mean'], [p90, 'p90']] as const) node.addEventListener('click', () => { baseline = value; render(); }, { signal: controller.signal });
  increase.addEventListener('input', render, { signal: controller.signal });
  beds.addEventListener('input', render, { signal: controller.signal });
  reset.addEventListener('click', () => { baseline = 'mean'; increase.value = beds.value = '0'; render(); }, { signal: controller.signal });
  render();
  return { update: summary => { current = summary; render(); }, destroy: () => { controller.abort(); admissionsChart.destroy(); loadChart.destroy(); root.remove(); } };
}
