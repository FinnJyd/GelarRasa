import type { StationObservation } from '../data/types';
import { element } from './dom';
import { number } from './format';

export function stationTable(stations: readonly StationObservation[]): HTMLElement {
  const details = element('details', 'data-disclosure');
  details.append(element('summary', '', `Lihat tabel data · ${stations.length} stasiun`));
  const wrap = element('div', 'table-scroll');
  wrap.tabIndex = 0;
  wrap.setAttribute('role', 'region');
  wrap.setAttribute('aria-label', 'Tabel stasiun; geser horizontal bila diperlukan');
  const table = element('table');
  const caption = element('caption', 'sr-only', 'Data stasiun sesuai filter; konsentrasi merupakan rata-rata periode ekspor.');
  const head = element('thead');
  const headings = element('tr');
  for (const title of ['Stasiun / lokasi', 'Wilayah', 'Tipe Lokasi', 'PM2.5 (µg/m³)', 'Kategori Harian Dominan', 'Catatan']) {
    const cell = element('th', '', title);
    cell.scope = 'col';
    headings.append(cell);
  }
  head.append(headings);
  const body = element('tbody');
  for (const station of stations) {
    const row = element('tr');
    const name = element('th');
    name.scope = 'row';
    name.append(element('strong', '', station.code), element('span', 'table-location', station.city));
    const concentration = element('td', 'numeric', station.average === null ? 'Tidak tersedia' : number(station.average));
    concentration.append(element('span', 'table-location', `${number(station.measuredDays)} / ${number(station.periodDays)} hari terukur (${number(station.validPercentage)}%)`));
    const category = element('td', '', station.category ?? 'Data tidak mencukupi');
    if (station.unavailableReason) category.title = station.unavailableReason;
    row.append(name, element('td', '', station.region), element('td', '', station.siteType), concentration, category, element('td', '', station.notes));
    body.append(row);
  }
  table.append(caption, head, body);
  wrap.append(table);
  details.append(wrap);
  return details;
}
