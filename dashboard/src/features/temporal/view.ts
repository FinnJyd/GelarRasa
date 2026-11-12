import { searchableSelect } from '../../components/search-select';
import { button, element } from '../../shared/dom';
import { metric, panel } from '../../shared/panel';
import {
  createDiurnalChart,
  createEpisodesChart,
  createHeatmapChart,
  createTimeseriesChart,
} from './charts';
import {
  getAllStationCodes,
  getDiurnalSeries,
  getHazeHotspotEpisodes,
  getHeatmapGrid,
  getLongestEpisodePerStation,
  getSiteTypes,
  getTimeseriesForStation,
  getTopEpisodes,
} from './model';
import type { TemporalData } from './types';

export function mountTemporalView(host: HTMLElement, data: TemporalData): {
  destroy: () => void;
} {
  const root = element('div', 'temporal-dashboard');

  // Summary Metrics Grid
  const metricsGrid = element('div', 'metrics-grid');
  const longest = data.episodes_summary.longest_episode;
  const most = data.episodes_summary.most_episodes;

  metricsGrid.append(
    metric(
      'Episode Ekstrem Terpanjang',
      `${longest.duration_days}`,
      'hari beruntun',
      `${longest.station} · ${longest.start} s.d. ${longest.end}`,
    ),
    metric(
      'Frekuensi Episode Terbanyak',
      `${most.count}`,
      'episode',
      `${most.station} (Ambang >55 µg/m³)`,
    ),
    metric(
      'Ambang Evaluasi Episode',
      `${data.meta.episode_threshold_ug_m3}`,
      'µg/m³',
      'Acuan Harian PP 22/2021 (≥18 jam valid)',
    ),
    metric(
      'Aturan Penggabungan Jeda',
      `${data.meta.episode_gap_merge_days}`,
      'hari',
      'Jeda 1 hari digabung sebagai 1 episode karhutla',
    ),
  );

  // Panel 1: Diurnal 24 Jam & Anomali Karhutla
  const diurnalPanel = panel(
    'Siklus Diurnal 24 Jam & Anomali Musim Karhutla',
    'Profil variasi per jam 00–23 (WIB): membuktikan bagaimana kebakaran hutan & lahan mengubah drastis profil polusi harian.',
  );

  const diurnalControls = element('div', 'diurnal-controls');
  diurnalControls.style.display = 'flex';
  diurnalControls.style.flexWrap = 'wrap';
  diurnalControls.style.alignItems = 'center';
  diurnalControls.style.gap = '10px';
  diurnalControls.style.marginBottom = '12px';

  const btnNormalMode = button('Rentang Interkuartil (P25–P75)', 'button button-primary');
  const btnHazeOverlay = button('Komparasi: Hotspot Karhutla vs Jakarta', 'button button-outline');

  const siteTypes = getSiteTypes(data);
  let selectedSiteType = siteTypes.includes('Peatland Boundary')
    ? 'Peatland Boundary'
    : (siteTypes[0] ?? 'Urban Background');

  const zoneSelect = searchableSelect('temporal-zone-filter', 'Pilih Zonasi', val => {
    if (val && siteTypes.includes(val)) {
      selectedSiteType = val;
      updateDiurnal();
    }
  });
  zoneSelect.setOptions(siteTypes.map(t => [t, t]), selectedSiteType);
  zoneSelect.field.style.minWidth = '220px';

  diurnalControls.append(btnNormalMode, btnHazeOverlay, zoneSelect.field);

  let isOverlayMode = false;
  const diurnalHost = element('div');
  const diurnalFootnote = element(
    'p',
    'panel-footnote',
    'Mode interkuartil menampilkan median, P25, dan P75 per jam. Mode komparasi membedakan profil wilayah gambut (hotspot karhutla) vs Jakarta pada musim kebakaran (Agu–Okt) dan bulan lainnya.',
  );
  diurnalPanel.body.append(diurnalControls, diurnalHost, diurnalFootnote);

  // Panel 2: Heatmap Hari x Jam
  const heatmapPanel = panel(
    'Matriks Temporal Hari × Jam (Weekday vs Weekend)',
    'Pola median konsentrasi PM2.5 per hari dalam sepekan (Senin–Minggu) dan jam dalam sehari (00–23).',
  );
  const heatmapControls = element('div', 'heatmap-controls');
  heatmapControls.style.display = 'flex';
  heatmapControls.style.alignItems = 'center';
  heatmapControls.style.gap = '12px';
  heatmapControls.style.marginBottom = '10px';

  const allStations = getAllStationCodes(data);
  let selectedHeatmapStation = allStations.includes('AQMS-KTG-01') ? 'AQMS-KTG-01' : (allStations[0] ?? '');
  const heatmapStationSelect = searchableSelect('heatmap-station-picker', 'Pilih Stasiun Pemantau', val => {
    if (val && allStations.includes(val)) {
      selectedHeatmapStation = val;
      updateHeatmap();
    }
  });
  heatmapStationSelect.setOptions(allStations.map(c => [c, c]), selectedHeatmapStation);
  heatmapStationSelect.field.style.minWidth = '240px';
  heatmapControls.append(heatmapStationSelect.field);

  const heatmapHost = element('div');
  const heatmapFootnote = element(
    'p',
    'panel-footnote',
    'Arahkan kursor pada kotak untuk melihat rincian nilai median PM2.5. Gunakan dropdown stasiun untuk membandingkan stasiun perkotaan vs stasiun perbatasan lahan gambut.',
  );
  heatmapPanel.body.append(heatmapControls, heatmapHost, heatmapFootnote);

  // Panel 3: Time Series Hotspot Stations
  const tsPanel = panel(
    'Deret Waktu Harian Stasiun Hotspot Karhutla',
    'Tren PM2.5 harian 2024–2026, garis batas PP 22/2021 (55 µg/m³ & 15 µg/m³), dan lonjakan musiman.',
  );
  const tsToolbar = element('div', 'ts-toolbar');
  tsToolbar.style.display = 'flex';
  tsToolbar.style.flexWrap = 'wrap';
  tsToolbar.style.justifyContent = 'space-between';
  tsToolbar.style.alignItems = 'center';
  tsToolbar.style.gap = '10px';
  tsToolbar.style.marginBottom = '12px';

  const tsSelectorContainer = element('div', 'ts-station-toggles');
  tsSelectorContainer.style.display = 'flex';
  tsSelectorContainer.style.flexWrap = 'wrap';
  tsSelectorContainer.style.gap = '6px';

  const defaultTsStations = ['AQMS-KTG-01', 'AQMS-KTG-02', 'AQMS-JMB-01', 'AQMS-JMB-02'];
  const optionalTsStations = ['AQMS-PKN-01', 'AQMS-PKU-01', 'AQMS-STG-01'];
  const activeTsStations = new Set<string>(defaultTsStations);

  [...defaultTsStations, ...optionalTsStations].forEach(code => {
    const btn = button(code, activeTsStations.has(code) ? 'button button-primary' : 'button button-outline');
    btn.style.fontSize = '12px';
    btn.style.padding = '4px 8px';
    btn.addEventListener('click', () => {
      if (activeTsStations.has(code)) {
        if (activeTsStations.size > 1) {
          activeTsStations.delete(code);
          btn.className = 'button button-outline';
        }
      } else {
        activeTsStations.add(code);
        btn.className = 'button button-primary';
      }
      updateTimeseries();
    });
    tsSelectorContainer.append(btn);
  });

  let isCappedScale = false;
  const btnScaleToggle = button('Fokus Baku Mutu (0–150 µg/m³)', 'button button-outline');
  btnScaleToggle.style.fontSize = '12px';
  btnScaleToggle.style.padding = '4px 10px';
  btnScaleToggle.addEventListener('click', () => {
    isCappedScale = !isCappedScale;
    if (isCappedScale) {
      btnScaleToggle.textContent = 'Skala Penuh (Spike Karhutla)';
      btnScaleToggle.className = 'button button-primary';
    } else {
      btnScaleToggle.textContent = 'Fokus Baku Mutu (0–150 µg/m³)';
      btnScaleToggle.className = 'button button-outline';
    }
    updateTimeseries();
  });

  tsToolbar.append(tsSelectorContainer, btnScaleToggle);

  const tsHost = element('div');
  const tsFootnote = element(
    'p',
    'panel-footnote',
    'Garis merah putus-putus menandai Baku Mutu Harian PP 22/2021 (55 µg/m³); garis hijau putus-putus menandai Baku Mutu Tahunan (15 µg/m³). Gunakan tombol toggle skala untuk memeriksa kepatuhan harian atau melihat puncak kebakaran gambut.',
  );
  tsPanel.body.append(tsToolbar, tsHost, tsFootnote);

  // Panel 4: Durasi Episode Ekstrem
  const episodesPanel = panel(
    'Durasi & Keparahan Episode Ekstrem (>55 µg/m³)',
    'Peringkat rentang waktu terpanjang di mana konsentrasi PM2.5 melampaui baku mutu PP 22/2021 secara terus-menerus.',
  );

  const episodesControls = element('div', 'episodes-controls');
  episodesControls.style.display = 'flex';
  episodesControls.style.flexWrap = 'wrap';
  episodesControls.style.gap = '8px';
  episodesControls.style.marginBottom = '12px';

  let episodesViewMode: 'hotspot' | 'per_station' | 'all' = 'hotspot';
  const btnEpHotspot = button('Stasiun Hotspot Karhutla Saja', 'button button-primary');
  const btnEpPerStation = button('Episode Terpanjang per Stasiun', 'button button-outline');
  const btnEpAll = button('Semua Episode Terpanjang', 'button button-outline');
  episodesControls.append(btnEpHotspot, btnEpPerStation, btnEpAll);

  btnEpHotspot.addEventListener('click', () => {
    episodesViewMode = 'hotspot';
    btnEpHotspot.className = 'button button-primary';
    btnEpPerStation.className = 'button button-outline';
    btnEpAll.className = 'button button-outline';
    updateEpisodes();
  });

  btnEpPerStation.addEventListener('click', () => {
    episodesViewMode = 'per_station';
    btnEpHotspot.className = 'button button-outline';
    btnEpPerStation.className = 'button button-primary';
    btnEpAll.className = 'button button-outline';
    updateEpisodes();
  });

  btnEpAll.addEventListener('click', () => {
    episodesViewMode = 'all';
    btnEpHotspot.className = 'button button-outline';
    btnEpPerStation.className = 'button button-outline';
    btnEpAll.className = 'button button-primary';
    updateEpisodes();
  });

  const episodesHost = element('div');
  const episodesFootnote = element('div', 'panel-footnote');
  episodesFootnote.innerHTML = `
    <strong>Metodologi Identifikasi Episode Ekstrem:</strong>
    <ol style="margin: 4px 0 0 16px; padding: 0; list-style-type: decimal;">
      <li>Menghitung rata-rata harian PM2.5 per stasiun (hanya menyertakan hari dengan &ge;18 jam valid).</li>
      <li>Menandai hari ekstrem bila rata-rata harian &gt;55 µg/m³ (mengikuti batas PP 22/2021).</li>
      <li>Mengelompokkan hari ekstrem beruntun dan menggabungkan jeda 1 hari (haze transient dip).</li>
      <li>Durasi dihitung sebagai: tanggal akhir &minus; tanggal awal + 1 hari.</li>
    </ol>
  `;
  episodesPanel.body.append(episodesControls, episodesHost, episodesFootnote);

  // Assemble full layout in DOM first!
  root.append(
    metricsGrid,
    diurnalPanel.root,
    heatmapPanel.root,
    tsPanel.root,
    episodesPanel.root,
  );
  host.replaceChildren(root);

  // Now create chart instances after nodes are in live DOM!
  const diurnalChart = createDiurnalChart(diurnalHost);
  const heatmapChart = createHeatmapChart(heatmapHost);
  const tsChart = createTimeseriesChart(tsHost);
  const episodesChart = createEpisodesChart(episodesHost);

  function updateDiurnal(): void {
    if (isOverlayMode) {
      zoneSelect.field.style.display = 'none';
      const hotspotHaze = getDiurnalSeries(data, 'Peatland Boundary', 'haze');
      const hotspotNonHaze = getDiurnalSeries(data, 'Peatland Boundary', 'nonhaze');
      const jktHaze = getDiurnalSeries(data, 'Urban Background', 'haze');
      const jktNonHaze = getDiurnalSeries(data, 'Urban Background', 'nonhaze');
      diurnalChart.updateOverlay(hotspotHaze, hotspotNonHaze, jktHaze, jktNonHaze);
    } else {
      zoneSelect.field.style.display = 'block';
      const singleData = getDiurnalSeries(data, selectedSiteType, 'all');
      diurnalChart.updateSingle(singleData, selectedSiteType);
    }
  }

  btnNormalMode.addEventListener('click', () => {
    isOverlayMode = false;
    btnNormalMode.className = 'button button-primary';
    btnHazeOverlay.className = 'button button-outline';
    updateDiurnal();
  });

  btnHazeOverlay.addEventListener('click', () => {
    isOverlayMode = true;
    btnNormalMode.className = 'button button-outline';
    btnHazeOverlay.className = 'button button-primary';
    updateDiurnal();
  });

  function updateHeatmap(): void {
    const grid = getHeatmapGrid(data, selectedHeatmapStation);
    heatmapChart.update(grid, selectedHeatmapStation);
  }

  function updateTimeseries(): void {
    const stationsData: Record<string, readonly (number | null)[]> = {};
    for (const code of activeTsStations) {
      stationsData[code] = getTimeseriesForStation(data, code).values;
    }
    tsChart.update(data.timeseries.dates, stationsData, isCappedScale);
  }

  function updateEpisodes(): void {
    if (episodesViewMode === 'hotspot') {
      episodesChart.update(getHazeHotspotEpisodes(data));
    } else if (episodesViewMode === 'per_station') {
      episodesChart.update(getLongestEpisodePerStation(data).slice(0, 15));
    } else {
      episodesChart.update(getTopEpisodes(data, 15));
    }
  }

  // Initial render
  updateDiurnal();
  updateHeatmap();
  updateTimeseries();
  updateEpisodes();

  return {
    destroy: () => {
      zoneSelect.destroy();
      heatmapStationSelect.destroy();
      diurnalChart.destroy();
      heatmapChart.destroy();
      tsChart.destroy();
      episodesChart.destroy();
      root.remove();
    },
  };
}
