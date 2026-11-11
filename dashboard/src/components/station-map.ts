import * as L from 'leaflet';
import { CATEGORIES } from '../data/types';
import type { DashboardData, Station } from '../data/types';
import { button, element } from '../shared/dom';
import { number } from '../shared/format';
import { categoryColors } from '../shared/palette';
import { referenceMarker } from './station-map-model';
import type { MapMode } from './station-map-model';

export function createStationMap(host: HTMLElement, reference: DashboardData['reference']): {
  update: (stations: readonly Station[]) => void;
  destroy: () => void;
} {
  const controller = new AbortController();
  let selected: readonly Station[] = [];
  let mode: MapMode = 'daily';
  const toolbar = element('div', 'map-toolbar');
  const modes = element('div', 'segmented-control');
  modes.setAttribute('role', 'group');
  modes.setAttribute('aria-label', 'Tampilan peta');
  const daily = button('Acuan Harian (ISPU 24-Jam)');
  const annual = button('Acuan Tahunan (PP 22/2021)');
  daily.setAttribute('aria-pressed', 'true');
  annual.setAttribute('aria-pressed', 'false');
  modes.append(daily, annual);
  const encoding = element('span', 'map-encoding', 'Pilihan Acuan:');
  toolbar.append(encoding, modes);
  const legendStrip = element('div', 'map-reference-legend');
  const legendTitle = element('h4');
  const legend = element('div', 'map-legend');
  const sizeTitle = element('h4');
  const sizeDescription = element('p', 'panel-footnote');
  const qualification = element('p', 'panel-footnote', 'Perbandingan memakai rata-rata periode pada ekspor, bukan audit kepatuhan tiap tahun.');
  const categoryExplanation = element('div', 'map-legend-column');
  const sizeExplanation = element('div', 'map-legend-column');
  categoryExplanation.append(legendTitle, legend);
  sizeExplanation.append(sizeTitle, sizeDescription);
  legendStrip.append(categoryExplanation, sizeExplanation);
  const viewport = element('div', 'station-map');
  viewport.setAttribute('aria-label', 'Peta lokasi stasiun; data lengkap tersedia di tabel setelah peta');
  const tileStatus = element('p', 'map-status', 'Peta dasar: Esri · Titik menunjukkan lokasi pemantauan.');
  tileStatus.setAttribute('role', 'status');
  host.append(toolbar, legendStrip, viewport, qualification, tileStatus);
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const map = L.map(viewport, {
    scrollWheelZoom: true, zoomAnimation: !reducedMotion,
    fadeAnimation: !reducedMotion, markerZoomAnimation: !reducedMotion,
  }).setView([-2.5, 118], 4);
  const tiles = L.tileLayer(
    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
    {
      attribution: 'Tiles &copy; <a href="https://www.esri.com/">Esri</a> &mdash; Sources: Esri, HERE, Garmin, USGS, Intermap, INCREMENT P, NRCan, Esri Japan, METI, Esri China (Hong Kong), Esri Korea, Esri (Thailand), NGCC, &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, and the GIS User Community',
      maxZoom: 19,
    },
  ).addTo(map);
  const markers = L.layerGroup().addTo(map);
  let tilesFailed = false;
  const failure = (): void => {
    if (tilesFailed) return;
    tilesFailed = true;
    tileStatus.textContent = 'Peta dasar belum dimuat. Titik stasiun dan tabel tetap tersedia.';
  };
  tiles.on('tileerror', failure);
  let bounds: L.LatLngBounds | null = null;
  const fit = (): void => {
    if (bounds) map.fitBounds(bounds, { padding: [24, 24], maxZoom: 9, animate: false });
  };
  const observer = new ResizeObserver(() => { map.invalidateSize({ pan: false }); });
  observer.observe(viewport);

  const render = (): void => {
    markers.clearLayers();
    const coordinates: L.LatLngTuple[] = [];
    for (const station of selected) {
      const position: L.LatLngTuple = [station.latitude, station.longitude];
      coordinates.push(position);
      const popup = element('div', 'station-popup');
      const style = referenceMarker(station, mode, reference.annual);
      const deviation = station.average - reference.annual;
      const identity = element('header', 'station-popup-header');
      identity.append(element('span', 'station-popup-code', station.code), element('h3', 'station-popup-name', station.name));
      const concentration = element('div', 'station-popup-concentration');
      const value = element('div', 'station-popup-value');
      value.append(element('strong', '', number(station.average)), element('span', '', 'µg/m³'));
      concentration.append(element('span', 'station-popup-label', 'PM2.5 · rata-rata periode'), value);
      const status = element('div', 'station-popup-status');
      const dot = element('span', 'station-popup-dot');
      dot.style.backgroundColor = style.color;
      dot.setAttribute('aria-hidden', 'true');
      status.append(dot, element('span', '', mode === 'daily'
        ? `ISPU Dominan: ${station.category}`
        : `${deviation <= 0 ? 'Di bawah' : 'Di atas'} acuan tahunan`));
      const detail = element('p', 'station-popup-detail', mode === 'daily'
        ? `${number(station.exceedance)}% hari > ${number(reference.daily)} µg/m³`
        : `${deviation > 0 ? '+' : ''}${number(deviation)} µg/m³ dari acuan ${number(reference.annual)} µg/m³`);
      popup.append(identity, element('p', 'station-popup-location', `${station.city}, ${station.province}`), concentration, status, detail);
      if (mode === 'annual') popup.append(element('small', 'station-popup-note', 'Rata-rata periode terpilih dibandingkan dengan acuan tahunan.'));
      const tooltip = element('div');
      tooltip.append(element('strong', '', station.name), element('p', '', mode === 'daily'
        ? `${station.city} · ISPU Dominan: ${station.category}`
        : `${station.city} · ${number(station.average)} µg/m³ · ${deviation <= 0 ? 'Memenuhi' : 'Melebihi'} acuan`));
      L.circleMarker(position, {
        radius: style.radius, color: '#fff', weight: 2, fillColor: style.color, fillOpacity: 0.9,
      }).bindPopup(popup, { className: 'station-map-popup', keepInView: true, minWidth: 200, maxWidth: 240, autoPanPadding: [16, 16] }).bindTooltip(tooltip).addTo(markers);
    }
    bounds = coordinates.length ? L.latLngBounds(coordinates) : null;
    if (bounds) fit();
    else map.setView([-2.5, 118], 4, { animate: false });
    legend.replaceChildren();
    if (mode === 'daily') {
      legendTitle.textContent = 'Kategori ISPU Dominan 24 Jam (Permen LHK 14/2020)';
      sizeTitle.textContent = 'Skala Radius Lingkaran (Frekuensi Pelanggaran 24 Jam)';
      sizeDescription.textContent = `Makin besar: makin sering stasiun melanggar baku mutu 24 jam PP 22/2021 (>${number(reference.daily)} µg/m³).`;
      for (const name of CATEGORIES) {
        const count = selected.filter(station => station.category === name).length;
        if (!count) continue;
        appendLegend(name, count, categoryColors[name]);
      }
    } else {
      legendTitle.textContent = `Kepatuhan Baku Mutu Tahunan PP 22/2021 (Batas: ${number(reference.annual)} µg/m³)`;
      sizeTitle.textContent = 'Skala Radius Lingkaran (Konsentrasi PM2.5 Aktual)';
      sizeDescription.textContent = `Makin besar: makin tinggi rata-rata konsentrasi PM2.5 stasiun; acuan ${number(reference.annual)} µg/m³.`;
      const below = selected.filter(station => station.average <= reference.annual).length;
      appendLegend(`Memenuhi (≤${number(reference.annual)} µg/m³)`, below, categoryColors.Baik);
      appendLegend(`Melebihi (>${number(reference.annual)} µg/m³)`, selected.length - below, categoryColors['Sangat Tidak Sehat']);
    }
  };

  function appendLegend(label: string, count: number, color: string): void {
    const item = element('span');
    const dot = element('i', 'swatch');
    dot.style.backgroundColor = color;
    dot.setAttribute('aria-hidden', 'true');
    item.append(dot, document.createTextNode(`${label} · ${count} stn (${selected.length ? number(count / selected.length * 100) : '0'}%)`));
    legend.append(item);
  }

  function setMode(next: MapMode): void {
    mode = next;
    daily.setAttribute('aria-pressed', String(mode === 'daily'));
    annual.setAttribute('aria-pressed', String(mode === 'annual'));
    render();
  }
  daily.addEventListener('click', () => setMode('daily'), { signal: controller.signal });
  annual.addEventListener('click', () => setMode('annual'), { signal: controller.signal });

  return {
    update: stations => { selected = stations; render(); },
    destroy: () => {
      controller.abort();
      observer.disconnect();
      tiles.off('tileerror', failure);
      markers.clearLayers();
      map.remove();
      host.replaceChildren();
    },
  };
}
