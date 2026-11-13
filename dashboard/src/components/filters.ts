import type { DashboardData, Feature, FilterState, Station } from '../data/types';
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
  setScope: (feature: Feature['id']) => void;
  destroy: () => void;
} {
  const controller = new AbortController();
  let state = defaultFilters();
  const effectiveState = (): FilterState => ({ ...state });
  const root = element('details', 'filters panel');
  root.id = 'dashboard-filters';
  const summary = element('summary', 'filter-heading');
  const copy = element('span', 'filter-heading-copy');
  const scopeStatus = element('span', 'filter-scope-status', 'Tanggal dan faskes membatasi bukti Tab 6; polutan dan QC mengubah cakupan paparan');
  scopeStatus.hidden = true;
  const selected = element('span', 'filter-summary');
  selected.id = 'filter-summary';
  const action = element('span', 'filter-disclosure');
  action.append(element('span', 'when-closed', 'Edit filter'), element('span', 'when-open', 'Sembunyikan'));
  const arrow = icon('down');
  arrow.classList.add('disclosure-arrow');
  action.append(arrow);
  copy.append(element('strong', '', 'Filter data'), scopeStatus, selected);
  summary.append(copy, action);
  const body = element('div', 'filter-body');
  const controls = element('fieldset', 'filter-controls');
  controls.setAttribute('aria-label', 'Pengaturan filter data');
  const grid = element('div', 'filter-grid');
  const region = searchableSelect('filter-region', 'Wilayah', value => { state.region = value; publish(); });
  const site = searchableSelect('filter-type', 'Tipe lokasi', value => { state.siteType = value; publish(); });
  const station = searchableSelect('filter-station', 'Stasiun', value => { state.station = value; publish(); });
  const dates = element('div', 'filter-field');
  const dateLabel = element('label', '', 'Rentang tanggal (Bebas)');
  dateLabel.htmlFor = 'filter-date-start';
  const rangeBox = element('div', 'date-range-inputs');
  const startInput = element('input');
  startInput.type = 'date';
  startInput.id = 'filter-date-start';
  startInput.min = data.start;
  startInput.max = data.end;
  startInput.value = state.startDate ?? data.start;
  startInput.setAttribute('aria-label', 'Tanggal mulai');

  const sep = element('span', 'date-separator', 's.d.');

  const endInput = element('input');
  endInput.type = 'date';
  endInput.id = 'filter-date-end';
  endInput.min = data.start;
  endInput.max = data.end;
  endInput.value = state.endDate ?? data.end;
  endInput.setAttribute('aria-label', 'Tanggal selesai');

  rangeBox.append(startInput, sep, endInput);
  dates.append(dateLabel, rangeBox);

  const syncDatesFromInputs = (): void => {
    let s = startInput.value || data.start;
    let e = endInput.value || data.end;
    if (s < data.start) s = data.start;
    if (s > data.end) s = data.end;
    if (e < data.start) e = data.start;
    if (e > data.end) e = data.end;
    if (s > e) {
      const tmp = s;
      s = e;
      e = tmp;
    }
    startInput.value = s;
    endInput.value = e;
    state.startDate = s;
    state.endDate = e;
    state.periodPreset = 'custom';
    preset.select.value = 'custom';
    publish();
  };

  startInput.addEventListener('change', syncDatesFromInputs, { signal: controller.signal });
  endInput.addEventListener('change', syncDatesFromInputs, { signal: controller.signal });

  const preset = selectField('Periode', 'filter-date-preset');
  const presetChoices: [string, string][] = [
    ['all', 'Seluruh periode (2024–2026)'],
    ['2024', 'Tahun 2024 Penuh'],
    ['2025', 'Tahun 2025 Penuh'],
    ['2026', 'Tahun 2026 (Jan–Okt)'],
    ['custom', 'Rentang Kustom (Bebas)'],
  ];
  options(preset.select, presetChoices, state.periodPreset ?? 'all');
  preset.select.disabled = false;
  preset.select.addEventListener('change', () => {
    state.periodPreset = preset.select.value;
    if (state.periodPreset === '2024') {
      state.startDate = '2024-01-01';
      state.endDate = '2024-12-31';
    } else if (state.periodPreset === '2025') {
      state.startDate = '2025-01-01';
      state.endDate = '2025-12-31';
    } else if (state.periodPreset === '2026') {
      state.startDate = '2026-01-01';
      state.endDate = '2026-10-14';
    } else if (state.periodPreset === 'all') {
      state.startDate = data.start;
      state.endDate = data.end;
    }
    startInput.value = state.startDate ?? data.start;
    endInput.value = state.endDate ?? data.end;
    publish();
  }, { signal: controller.signal });

  const pollutant = element('div', 'filter-field');
  const pollutantLabel = element('span', 'field-label', 'Polutan');
  const choices = element('div', 'pollutant-options');
  choices.setAttribute('role', 'group');
  choices.setAttribute('aria-label', 'Pilihan polutan kriteria');
  const activePollutant = state.pollutant ?? 'PM2.5';
  for (const name of ['PM2.5', 'PM10', 'SO2', 'CO', 'O3', 'NO2']) {
    const choice = button(name, name === activePollutant ? 'pollutant active' : 'pollutant');
    choice.disabled = false;
    choice.setAttribute('aria-pressed', String(name === activePollutant));
    choice.addEventListener('click', () => {
      state.pollutant = name;
      for (const btn of choices.querySelectorAll<HTMLButtonElement>('.pollutant')) {
        const isActive = btn.textContent === name;
        btn.classList.toggle('active', isActive);
        btn.setAttribute('aria-pressed', String(isActive));
      }
      publish();
    }, { signal: controller.signal });
    choices.append(choice);
  }
  pollutant.append(pollutantLabel, choices);
  grid.append(dates, region.field, station.field, preset.field, site.field, pollutant);
  const footer = element('div', 'filter-footer');
  const suspect = element('label', 'suspect-option');
  const suspectInput = element('input');
  suspectInput.type = 'checkbox';
  suspectInput.id = 'filter-suspect';
  suspectInput.checked = Boolean(state.includeSuspect);
  suspectInput.disabled = false;
  suspectInput.addEventListener('change', () => {
    state.includeSuspect = suspectInput.checked;
    publish();
  }, { signal: controller.signal });
  suspect.append(suspectInput, element('span', '', 'Sertakan data SUSPECT'));
  const reset = button('Reset filter', 'button button-subtle');
  reset.id = 'filter-reset';
  footer.append(suspect, reset);
  const explanation = element('p', 'filter-note', 'Aktif: Deret harian 2024–2026 · 6 Polutan kriteria · Mode QC VALID & SUSPECT.');
  explanation.id = 'filter-availability';
  for (const control of [startInput, endInput, preset.select, suspectInput]) control.setAttribute('aria-describedby', explanation.id);
  choices.setAttribute('aria-describedby', explanation.id);
  controls.append(grid, footer);
  body.append(controls, explanation);
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
    const activeStart = state.startDate ?? data.start;
    const activeEnd = state.endDate ?? data.end;
    const items: { label: string; active: boolean }[] = [
      {
        label: period(activeStart, activeEnd),
        active: activeStart !== data.start || activeEnd !== data.end,
      },
      {
        label: state.region === 'all' ? 'Semua wilayah' : state.region,
        active: state.region !== 'all',
      },
      {
        label: chosen?.code ?? 'Semua stasiun',
        active: state.station !== 'all',
      },
      {
        label: state.siteType === 'all' ? 'Semua tipe lokasi' : state.siteType,
        active: state.siteType !== 'all',
      },
      {
        label: effectiveState().pollutant ?? 'PM2.5',
        active: (effectiveState().pollutant ?? 'PM2.5') !== 'PM2.5',
      },
      {
        label: state.includeSuspect ? 'VALID + SUSPECT' : 'VALID',
        active: Boolean(state.includeSuspect),
      },
    ];
    selected.replaceChildren(...items.map(({ label, active }) =>
      element('span', active ? 'filter-badge is-active' : 'filter-badge', label)
    ));
    return cleared;
  }

  const publish = (): void => {
    const cleared = synchronize();
    onChange(effectiveState(), cleared ? 'Pilihan yang tidak sesuai telah direset. ' : '');
  };
  region.setOptions([['all', 'Semua wilayah'], ...distinct(data.stations, 'region').map(value => [value, value] satisfies [string, string])], 'all');
  reset.addEventListener('click', () => {
    state = defaultFilters();
    region.setOptions([['all', 'Semua wilayah'], ...distinct(data.stations, 'region').map(value => [value, value] satisfies [string, string])], 'all');
    preset.select.value = 'all';
    startInput.value = data.start;
    endInput.value = data.end;
    suspectInput.checked = false;
    for (const btn of choices.querySelectorAll<HTMLButtonElement>('.pollutant')) {
      const isDefault = btn.textContent === 'PM2.5';
      btn.classList.toggle('active', isDefault);
      btn.setAttribute('aria-pressed', String(isDefault));
    }
    publish();
  }, { signal: controller.signal });
  const close = (): void => { region.close(); site.close(); station.close(); };
  root.addEventListener('toggle', () => { if (!root.open) close(); }, { signal: controller.signal });
  synchronize();
  return {
    root, state: effectiveState, close,
    setScope: feature => {
      close();
      scopeStatus.hidden = feature !== 'recommendations';
      explanation.textContent = feature === 'recommendations'
        ? 'Tanggal dan faskes membatasi bukti, matriks respons, dan asumsi kapasitas manual; polutan dan QC mengubah cakupan paparan. Profil model tetap memakai rentang acuan latihnya.'
        : feature === 'temporal' || feature === 'drivers'
        ? 'Wilayah, stasiun, tipe lokasi, tanggal, polutan, dan QC memperbarui seluruh analisis. Kontrol pada grafik hanya mengubah tampilan atau membandingkan musim dalam periode pilihan.'
        : feature === 'compliance'
        ? 'Enam polutan mengikuti filter. IKU selalu memakai NO2 + SO2; wilayah, stasiun, tipe lokasi, tanggal, dan QC berlaku. Tahun evaluasi dan periode perbandingan dijelaskan pada grafik.'
        : 'Aktif: Deret harian 2024–2026 · 6 Polutan kriteria · Mode QC VALID & SUSPECT.';
      synchronize();
    },
    destroy: () => { controller.abort(); region.destroy(); site.destroy(); station.destroy(); },
  };
}
