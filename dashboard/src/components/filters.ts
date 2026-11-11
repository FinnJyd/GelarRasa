import type { DashboardData, FilterState, Station } from '../data/types';
import { defaultFilters, filterStations } from '../features/overview/model';
import { button, element } from '../shared/dom';
import { icon } from '../shared/icons';
import { period } from '../shared/format';
import { searchableSelect } from './search-select';

function selectField(label: string, id: string): { field: HTMLElement; select: HTMLSelectElement } {
  const field = element('div', 'filter-field');
  const caption = element('label', '', label);
  caption.htmlFor = id;
  const select = element('select');
  select.id = id;
  const control = element('div', 'select-control');
  control.append(select, icon('down'));
  field.append(caption, control);
  return { field, select };
}

function options(select: HTMLSelectElement, values: readonly [string, string][], selected: string): void {
  select.replaceChildren(...values.map(([value, label]) => {
    const option = element('option', '', label);
    option.value = value;
    return option;
  }));
  select.value = selected;
}

const distinct = (stations: readonly Station[], key: 'region' | 'siteType'): string[] =>
  [...new Set(stations.map(station => station[key]))].sort((a, b) => a.localeCompare(b, 'id'));

export function createFilters(data: DashboardData, onChange: (state: FilterState, announcement: string) => void): {
  root: HTMLDetailsElement;
  state: () => FilterState;
  close: () => void;
  destroy: () => void;
} {
  const controller = new AbortController();
  let state = defaultFilters();
  const root = element('details', 'filters panel');
  root.id = 'dashboard-filters';
  const summary = element('summary', 'filter-heading');
  const copy = element('span', 'filter-heading-copy');
  const selected = element('span', 'filter-summary');
  selected.id = 'filter-summary';
  const action = element('span', 'filter-disclosure');
  action.append(element('span', 'when-closed', 'Edit filter'), element('span', 'when-open', 'Sembunyikan'));
  const arrow = icon('down');
  arrow.classList.add('disclosure-arrow');
  action.append(arrow);
  copy.append(element('strong', '', 'Filter data'), selected);
  summary.append(copy, action);
  const body = element('div', 'filter-body');
  const grid = element('div', 'filter-grid');
  const region = searchableSelect('filter-region', 'Wilayah', value => { state.region = value; publish(); });
  const site = searchableSelect('filter-type', 'Tipe lokasi', value => { state.siteType = value; publish(); });
  const station = searchableSelect('filter-station', 'Stasiun', value => { state.station = value; publish(); });
  const dates = element('div', 'filter-field');
  const dateLabel = element('label', '', 'Rentang tanggal');
  dateLabel.htmlFor = 'filter-date-range';
  const dateInput = element('input');
  dateInput.id = 'filter-date-range';
  dateInput.value = period(data.start, data.end);
  dateInput.disabled = true;
  dates.append(dateLabel, dateInput);
  const preset = selectField('Periode', 'filter-date-preset');
  options(preset.select, [['all', 'Seluruh periode ekspor']], 'all');
  preset.select.disabled = true;
  const pollutant = element('div', 'filter-field');
  const pollutantLabel = element('span', 'field-label', 'Polutan');
  const choices = element('div', 'pollutant-options');
  choices.setAttribute('role', 'group');
  choices.setAttribute('aria-label', 'Polutan yang tersedia dalam ekspor');
  for (const name of ['PM2.5', 'PM10', 'SO2', 'CO', 'O3', 'NO2']) {
    const choice = button(name, name === 'PM2.5' ? 'pollutant active' : 'pollutant');
    choice.disabled = true;
    choice.setAttribute('aria-pressed', String(name === 'PM2.5'));
    choices.append(choice);
  }
  pollutant.append(pollutantLabel, choices);
  grid.append(dates, region.field, station.field, preset.field, site.field, pollutant);
  const footer = element('div', 'filter-footer');
  const suspect = element('label', 'suspect-option');
  const suspectInput = element('input');
  suspectInput.type = 'checkbox';
  suspectInput.id = 'filter-suspect';
  suspectInput.disabled = true;
  suspect.append(suspectInput, element('span', '', 'Sertakan data SUSPECT'));
  const reset = button('Reset filter', 'button button-subtle');
  reset.id = 'filter-reset';
  footer.append(suspect, reset);
  const explanation = element('p', 'filter-note', 'Tersedia: PM2.5 · seluruh periode · VALID. Dimensi lainnya belum tersedia.');
  explanation.id = 'filter-availability';
  for (const control of [dateInput, preset.select, suspectInput]) control.setAttribute('aria-describedby', explanation.id);
  choices.setAttribute('aria-describedby', explanation.id);
  body.append(grid, footer, explanation);
  root.append(summary, body);

  function synchronize(): boolean {
    let cleared = false;
    const regional = data.stations.filter(item => state.region === 'all' || item.region === state.region);
    const siteTypes = distinct(regional, 'siteType');
    if (state.siteType !== 'all' && !siteTypes.includes(state.siteType)) {
      state.siteType = 'all';
      cleared = true;
    }
    site.setOptions([['all', 'Semua tipe lokasi'], ...siteTypes.map(value => [value, value] satisfies [string, string])], state.siteType);
    const eligible = filterStations(data.stations, { ...state, station: 'all' });
    if (state.station !== 'all' && !eligible.some(item => item.code === state.station)) {
      state.station = 'all';
      cleared = true;
    }
    station.setOptions([['all', 'Semua stasiun'], ...eligible.map(item => [item.code, `${item.code} · ${item.city}`] satisfies [string, string])], state.station);
    const chosen = data.stations.find(item => item.code === state.station);
    const parts = [period(data.start, data.end), state.region === 'all' ? 'Semua wilayah' : state.region,
      chosen?.code ?? 'Semua stasiun'];
    if (state.siteType !== 'all') parts.push(state.siteType);
    parts.push('PM2.5', 'VALID');
    selected.textContent = parts.join(' · ');
    return cleared;
  }

  const publish = (): void => {
    const cleared = synchronize();
    onChange({ ...state }, cleared ? 'Pilihan yang tidak sesuai telah direset. ' : '');
  };
  region.setOptions([['all', 'Semua wilayah'], ...distinct(data.stations, 'region').map(value => [value, value] satisfies [string, string])], 'all');
  reset.addEventListener('click', () => {
    state = defaultFilters();
    region.setOptions([['all', 'Semua wilayah'], ...distinct(data.stations, 'region').map(value => [value, value] satisfies [string, string])], 'all');
    publish();
  }, { signal: controller.signal });
  const close = (): void => { region.close(); site.close(); station.close(); };
  root.addEventListener('toggle', () => { if (!root.open) close(); }, { signal: controller.signal });
  synchronize();
  return {
    root, state: () => ({ ...state }), close,
    destroy: () => { controller.abort(); region.destroy(); site.destroy(); station.destroy(); },
  };
}
