import * as L from 'leaflet';
import { element } from '../../shared/dom';
import { number } from '../../shared/format';
import type { PolicyData, PolicyStation, StationEvidence } from './types';

const colors = { Active: '#087f8c', Intermittent: '#bf7b0a', Defective: '#ef4444' };
export function policyMap(host: HTMLElement, data: PolicyData): { update: (rows: readonly StationEvidence[]) => void; coverage: (radiusKm: number | null) => void; focus: (code: string) => void; destroy: () => void } {
  const controller = new AbortController();
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const frame = element('div', 'policy-map');
  frame.tabIndex = 0;
  frame.setAttribute('role', 'region'); frame.setAttribute('aria-label', 'Peta jaringan stasiun AQMS terpasang');
  const status = element('p', 'panel-footnote'); status.setAttribute('role', 'status');
  host.append(frame, status);
  const map = L.map(frame, { scrollWheelZoom: true, zoomAnimation: !motion.matches, fadeAnimation: !motion.matches, markerZoomAnimation: !motion.matches });
  let ownedObserver: ResizeObserver | null = null;
  try {
    const tiles = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
      attribution: 'Tiles &copy; Esri &mdash; Sources: Esri, HERE, Garmin, FAO, NOAA, USGS, &copy; OpenStreetMap contributors', maxZoom: 18,
    }).addTo(map);
    tiles.on('tileerror', () => { if (!status.textContent) status.textContent = 'Peta dasar tidak tersedia; titik stasiun dan daftar bukti tetap dapat digunakan.'; });
    let current = new Map<string, StationEvidence>();
    let selection = '';
    const markers = new Map<string, L.CircleMarker>();
    const coverage = new Map<string, L.Circle>();
    let radius: number | null = null;
    function refreshCoverage(): void {
      for (const [code, circle] of coverage) { circle.remove(); if (radius !== null && current.has(code)) { circle.setRadius(radius * 1000); circle.addTo(map); circle.bringToBack(); } }
    }
    function popup(station: PolicyStation): HTMLElement {
      const root = element('div', 'station-popup');
      const row = current.get(station.code);
      root.append(element('strong', '', station.code), element('p', '', station.city),
        element('p', '', `Status master: ${station.status}`),
        element('p', '', `Terdekat: ${station.nearest.code} · ${number(station.nearest.km)} km`),
        element('p', '', row ? `${row.valid} hari paparan tersedia pada periode pilihan.` : 'Stasiun referensi di luar wilayah pilihan.'));
      return root;
    }
    map.fitBounds(L.latLngBounds(data.stations.map((station): L.LatLngTuple => [station.latitude, station.longitude])), { padding: [30, 30], animate: false });
    for (const station of data.stations) {
      const marker = L.circleMarker([station.latitude, station.longitude], { radius: 8, color: colors[station.status], fillColor: colors[station.status], fillOpacity: .8, weight: 2 }).addTo(map);
      marker.bindPopup(() => popup(station), { className: 'station-map-popup', maxWidth: 240 });
      marker.bindTooltip(`${station.code} · ${station.city} · ${station.status} · terdekat ${number(station.nearest.km)} km`);
      const node = marker.getElement();
      if (node) {
        node.setAttribute('tabindex', '0'); node.setAttribute('role', 'button'); node.setAttribute('aria-label', `Detail ${station.code}, ${station.city}, ${station.status}`);
        node.addEventListener('keydown', event => { if (event instanceof KeyboardEvent && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); marker.openPopup(); } }, { signal: controller.signal });
      }
      markers.set(station.code, marker);
      coverage.set(station.code, L.circle([station.latitude, station.longitude], { radius: 0, interactive: false, weight: 1, color: '#087f8c', fillOpacity: .05 }));
    }
    const observer = new ResizeObserver(() => {
      map.invalidateSize({ pan: false });
      // Leaflet may cache the new size first; refresh vector bounds without moving the view.
      map.fire('moveend');
    });
    observer.observe(frame); ownedObserver = observer;
    motion.addEventListener('change', () => {
      map.options.zoomAnimation = map.options.fadeAnimation = map.options.markerZoomAnimation = !motion.matches;
      if (motion.matches) map.stop();
    }, { signal: controller.signal });
    return {
      update: rows => {
        current = new Map(rows.map(row => [row.station.code, row]));
        for (const station of data.stations) {
          const active = current.has(station.code);
          markers.get(station.code)?.setStyle({ color: active ? colors[station.status] : '#607581', fillColor: active ? colors[station.status] : '#607581', opacity: active ? 1 : .35, fillOpacity: active ? .8 : .12 });
          markers.get(station.code)?.setRadius(active ? 9 : 5);
        }
        const next = [...current.keys()].sort().join(',');
        if (next !== selection || !selection) {
          const points = rows.length ? rows.map(row => row.station) : data.stations;
          const bounds = L.latLngBounds(points.map((station): L.LatLngTuple => [station.latitude, station.longitude]));
          map.fitBounds(bounds, { maxZoom: 8, padding: [30, 30], animate: false }); selection = next;
        }
        refreshCoverage(); map.closePopup();
      },
      coverage: value => { radius = value; refreshCoverage(); },
      focus: code => { const marker = markers.get(code); if (marker) { map.panTo(marker.getLatLng(), { animate: !motion.matches }); marker.openPopup(); frame.focus(); } },
      destroy: () => { controller.abort(); observer.disconnect(); tiles.off(); map.off(); map.remove(); host.replaceChildren(); },
    };
  } catch (error: unknown) {
    controller.abort(); ownedObserver?.disconnect(); map.off(); map.remove(); host.replaceChildren();
    throw error;
  }
}
