import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { CATEGORIES } from '../data/types';
import type { Station } from '../data/types';
import { button, element } from '../shared/dom';
import { number } from '../shared/format';
import { categoryColors } from '../shared/palette';

export function createStationMap(host: HTMLElement): {
  update: (stations: readonly Station[]) => void;
  destroy: () => void;
} {
  const controller = new AbortController();
  let selected: readonly Station[] = [];
  let mode: 'category' | 'concentration' = 'category';
  const toolbar = element('div', 'map-toolbar');
  const modes = element('div', 'segmented-control');
  modes.setAttribute('role', 'group');
  modes.setAttribute('aria-label', 'Tampilan peta');
  const category = button('Kategori');
  const concentration = button('Konsentrasi');
  category.setAttribute('aria-pressed', 'true');
  concentration.setAttribute('aria-pressed', 'false');
  modes.append(category, concentration);
  const encoding = element('span', 'map-encoding', 'Warna = kategori dominan');
  toolbar.append(modes, encoding);
  const legend = element('div', 'map-legend');
  const viewport = element('div', 'station-map');
  viewport.setAttribute('aria-label', 'Peta lokasi stasiun; data lengkap tersedia di tabel setelah peta');
  const tileStatus = element('p', 'map-status', 'Peta dasar: Esri · Titik menunjukkan lokasi pemantauan.');
  tileStatus.setAttribute('role', 'status');
  host.append(toolbar, viewport, legend, tileStatus);
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const map = L.map(viewport, {
    scrollWheelZoom: false, zoomAnimation: !reducedMotion,
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
  const observer = new ResizeObserver(() => { map.invalidateSize({ pan: false }); fit(); });
  observer.observe(viewport);

  const render = (): void => {
    markers.clearLayers();
    const coordinates: L.LatLngTuple[] = [];
    const maximum = Math.max(0, ...selected.map(station => station.average));
    for (const station of selected) {
      const position: L.LatLngTuple = [station.latitude, station.longitude];
      coordinates.push(position);
      const popup = element('div', 'station-popup');
      popup.append(
        element('strong', '', station.code), element('p', '', station.city),
        element('p', '', `${number(station.average)} µg/m³ · ${station.category}`),
        element('small', '', 'Rata-rata periode · klasifikasi sementara'),
      );
      const radius = mode === 'category' || maximum === 0
        ? 8 : Math.max(5, 14 * Math.sqrt(station.average / maximum));
      L.circleMarker(position, {
        radius, color: '#fff', weight: 2,
        fillColor: mode === 'category' ? categoryColors[station.category] : '#0284c7',
        fillOpacity: 0.9,
      }).bindPopup(popup).addTo(markers);
    }
    bounds = coordinates.length ? L.latLngBounds(coordinates) : null;
    if (bounds) fit();
    else map.setView([-2.5, 118], 4, { animate: false });
    legend.replaceChildren();
    if (mode === 'category') {
      for (const name of CATEGORIES) {
        const count = selected.filter(station => station.category === name).length;
        if (!count) continue;
        const item = element('span');
        const dot = element('i', 'swatch');
        dot.style.backgroundColor = categoryColors[name];
        dot.setAttribute('aria-hidden', 'true');
        item.append(dot, document.createTextNode(`${name} (${count})`));
        legend.append(item);
      }
    } else {
      legend.append(element('span', '', 'Titik lebih besar = konsentrasi lebih tinggi.'));
    }
  };
  category.addEventListener('click', () => {
    mode = 'category';
    category.setAttribute('aria-pressed', 'true');
    concentration.setAttribute('aria-pressed', 'false');
    encoding.textContent = 'Warna = kategori dominan';
    render();
  }, { signal: controller.signal });
  concentration.addEventListener('click', () => {
    mode = 'concentration';
    category.setAttribute('aria-pressed', 'false');
    concentration.setAttribute('aria-pressed', 'true');
    encoding.textContent = 'Ukuran = konsentrasi relatif';
    render();
  }, { signal: controller.signal });

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
