import { element, emptyState } from '../../shared/dom';
import { choiceButton, choiceGroup, setSelected } from '../../shared/analysis-controls';
import { number, period } from '../../shared/format';
import { metric, panel } from '../../shared/panel';
import { REFERENCES } from '../../shared/pollutants';
import {
  createDiurnalChart,
  createEpisodesChart,
  createEpisodeSeverityScatterChart,
  createHeatmapChart,
  createMonthlySeasonalityChart,
  createTimeseriesChart,
} from './charts';
import {
  episodeIndicators,
  getDiurnalSeries,
  getEpisodeScatterPoints,
  getLongestEpisodePerStation,
  getMonthlySeasonality,
  getTopEpisodes,
} from './model';
import type { TemporalData } from './types';

export function mountTemporalView(host: HTMLElement, initial: TemporalData): { update: (data: TemporalData) => void; destroy: () => void } {
  let data = initial;
  let compare = false;
  let perStation = true;
  let trendMode: 'aggregate' | 'stations' = 'aggregate';
  let seasonalMode: 'years' | 'distribution' = 'years';

  const controller = new AbortController();
  const root = element('div', 'temporal-dashboard analysis-dashboard');
  const summary = panel('Ringkasan Pola Waktu', '', 'analysis-summary');
  const metrics = element('div', 'metrics-grid analysis-metrics');
  summary.body.append(metrics);
  const empty = emptyState('Data belum mencukupi', 'Tidak ada pengukuran yang memenuhi syarat pada pilihan ini.');

  // Panel 1: Profil Polusi & Tren Harian
  const timePanel = panel('Profil Polusi & Tren Harian', 'Siklus diurnal per jam (00–23 WIB) dan deret waktu harian stasiun pilihan', 'temporal-combined-panel');
  const pair = element('div', 'temporal-pair');

  // Subpanel kiri: Profil Polusi per Jam
  const profileSub = element('div', 'temporal-subpanel');
  const profileHeader = element('div', 'temporal-subpanel-header');
  profileHeader.append(
    element('h4', 'temporal-subpanel-title', 'Profil Polusi per Jam'),
    element('p', 'temporal-subpanel-subtitle', 'Median dan rentang P25–P75 · jam 00–23 WIB'),
  );
  const normal = choiceButton('Profil per jam', true);
  const comparison = choiceButton('Bandingkan');
  const profileHost = element('div');
  const profileFootnote = element('p', 'panel-footnote', 'Seluruh stasiun pilihan digabung per jam lokal (min. 10 jam-stasiun/sel). Perbandingan memisahkan Agu–Okt dan Nov–Jul.');
  profileSub.append(profileHeader, choiceGroup('Tampilan profil per jam', [normal, comparison]), profileHost, profileFootnote);

  // Subpanel kanan: Tren Harian Stasiun
  const trendSub = element('div', 'temporal-subpanel');
  const trendHeader = element('div', 'temporal-subpanel-header');
  trendHeader.append(
    element('h4', 'temporal-subpanel-title', 'Tren Harian Stasiun'),
    element('p', 'temporal-subpanel-subtitle', 'Rata-rata 24 jam · minimum 18 jam berbeda per hari'),
  );
  const aggregateTrend = choiceButton('Rata-rata gabungan', true);
  const stationTrend = choiceButton('Per stasiun', false);
  const trendHost = element('div');
  const trendFootnote = element('p', 'panel-footnote');
  trendSub.append(trendHeader, choiceGroup('Tampilan tren harian', [aggregateTrend, stationTrend]), trendHost, trendFootnote);

  pair.append(profileSub, trendSub);
  timePanel.body.append(pair);

  // Panel 2: Polusi menurut Hari & Jam
  const heatmap = panel('Polusi menurut Hari & Jam', 'Median seluruh stasiun pilihan · minimum 5 jam-stasiun per sel');
  const heatmapHost = element('div');
  heatmap.body.append(
    heatmapHost,
    element('p', 'panel-footnote', 'Geser untuk melihat 24 jam; arahkan kursor atau ketuk sel untuk membaca konsentrasi. Warna menunjukkan rentang konsentrasi dalam pilihan, bukan kategori ISPU per jam.'),
  );

  // Panel 3: Siklus Musiman Bulanan
  const seasonalPanel = panel(
    'Siklus Musiman Bulanan',
    'Variasi konsentrasi rata-rata per bulan kalender (Januari–Desember) lintas tahun 2024–2026',
  );
  const seasonYearsBtn = choiceButton('Komparasi Antar-Tahun', true);
  const seasonDistBtn = choiceButton('Rentang Gabungan (P25–P75)', false);
  const seasonalGroup = choiceGroup('Tampilan musiman', [seasonYearsBtn, seasonDistBtn]);
  seasonalGroup.classList.add('mb-3');
  const seasonalHost = element('div');
  seasonalPanel.body.append(
    seasonalGroup,
    seasonalHost,
    element(
      'p',
      'panel-footnote',
      'Median konsentrasi bulanan seluruh stasiun pilihan (Jan–Des). Garis putus merah menandai acuan baku mutu PP 22/2021. Puncak konsentrasi secara konsisten terjadi pada musim kemarau dan karhutla (Agustus–Oktober).',
    ),
  );

  // Panel 4: Episode Pelampauan & Keparahan Ekstrem
  const episodePanel = panel('Episode Pelampauan & Keparahan Ekstrem', '');
  const episodeGrid = element('div', 'episode-comparison-grid grid grid-cols-1 lg:grid-cols-2 gap-6');

  // Subpanel kiri: Peringkat Durasi Episode Top 10
  const episodeLeftBox = element('div', 'episode-col flex flex-col');
  const episodeLeftTitle = element('h4', 'text-sm font-semibold mb-2', 'Peringkat Durasi Episode Terpanjang (Top 10)');
  const each = choiceButton('Per stasiun', true);
  const all = choiceButton('Semua episode');
  const episodeModeGroup = choiceGroup('Tampilan episode', [each, all]);
  episodeModeGroup.classList.add('mb-3');
  const episodeHost = element('div');
  episodeLeftBox.append(
    episodeLeftTitle,
    episodeModeGroup,
    episodeHost,
    element(
      'p',
      'panel-footnote',
      'Peringkat menampilkan maksimum 10 episode terpanjang dalam rentang pilihan. Hari berlebih beruntun digabung (toleransi 1 hari jeda); hari hilang memutus episode.',
    ),
  );

  // Subpanel kanan: Matriks Keparahan Episode
  const episodeRightBox = element('div', 'episode-col flex flex-col');
  const episodeRightTitle = element('h4', 'text-sm font-semibold mb-2', 'Matriks Keparahan: Durasi vs Konsentrasi Puncak');
  const severityBadge = element('div', 'episode-severity-badge flex items-center text-xs text-muted mb-3 min-h-[42px]');
  severityBadge.textContent = 'Plot sebaran seluruh episode terukur · Warna merah menandai episode kronis >30 hari';
  const severityHost = element('div');
  episodeRightBox.append(
    episodeRightTitle,
    severityBadge,
    severityHost,
    element(
      'p',
      'panel-footnote',
      'Memetakan hubungan durasi episode (hari) terhadap lonjakan konsentrasi puncak (µg/m³). Membedakan episode kronis berkepanjangan dengan lonjakan tajam sesaat.',
    ),
  );

  episodeGrid.append(episodeLeftBox, episodeRightBox);
  episodePanel.body.append(episodeGrid);

  root.append(summary.root, empty, timePanel.root, heatmap.root, seasonalPanel.root, episodePanel.root);
  host.replaceChildren(root);

  const pollutant = () => data.meta.pollutant;
  const profileChart = createDiurnalChart(profileHost, pollutant);
  const matrix = createHeatmapChart(heatmapHost, pollutant);
  const series = createTimeseriesChart(trendHost, pollutant);
  const seasonalChart = createMonthlySeasonalityChart(seasonalHost, pollutant);
  const episodeChart = createEpisodesChart(episodeHost, pollutant);
  const severityChart = createEpisodeSeverityScatterChart(severityHost, pollutant);

  const renderProfile = (): void => {
    const points = (mode: 'all' | 'haze' | 'nonhaze') => getDiurnalSeries(data, 'Pilihan', mode);
    if (compare) profileChart.updateOverlay(points('haze'), points('nonhaze'));
    else profileChart.updateSingle(points('all'), 'Seluruh stasiun pilihan');
  };

  const renderEpisodes = (): void => {
    episodeChart.update(perStation ? getLongestEpisodePerStation(data, 10) : getTopEpisodes(data, 10));
  };

  const renderTrend = (): void => {
    trendFootnote.textContent = trendMode === 'aggregate'
      ? 'Garis biru: median harian stasiun pilihan; area arsir: rentang P25–P75. Garis putus merah menandai acuan 24 jam PP 22/2021.'
      : 'Semua stasiun dalam filter ditampilkan; hari tidak mencukupi tetap kosong. Garis putus menandai acuan regulasi PP 22/2021.';
    series.update(data.timeseries.dates, data.timeseries.stations, trendMode, false);
  };

  const renderSeasonality = (): void => {
    seasonalChart.update(getMonthlySeasonality(data), seasonalMode);
  };

  const renderSeverity = (): void => {
    severityChart.update(getEpisodeScatterPoints(data));
  };

  normal.addEventListener('click', () => {
    compare = false;
    setSelected(normal, true);
    setSelected(comparison, false);
    renderProfile();
  }, { signal: controller.signal });

  comparison.addEventListener('click', () => {
    compare = true;
    setSelected(normal, false);
    setSelected(comparison, true);
    renderProfile();
  }, { signal: controller.signal });

  aggregateTrend.addEventListener('click', () => {
    trendMode = 'aggregate';
    setSelected(aggregateTrend, true);
    setSelected(stationTrend, false);
    renderTrend();
  }, { signal: controller.signal });

  stationTrend.addEventListener('click', () => {
    trendMode = 'stations';
    setSelected(aggregateTrend, false);
    setSelected(stationTrend, true);
    renderTrend();
  }, { signal: controller.signal });

  seasonYearsBtn.addEventListener('click', () => {
    seasonalMode = 'years';
    setSelected(seasonYearsBtn, true);
    setSelected(seasonDistBtn, false);
    renderSeasonality();
  }, { signal: controller.signal });

  seasonDistBtn.addEventListener('click', () => {
    seasonalMode = 'distribution';
    setSelected(seasonYearsBtn, false);
    setSelected(seasonDistBtn, true);
    renderSeasonality();
  }, { signal: controller.signal });

  each.addEventListener('click', () => {
    perStation = true;
    setSelected(each, true);
    setSelected(all, false);
    renderEpisodes();
  }, { signal: controller.signal });

  all.addEventListener('click', () => {
    perStation = false;
    setSelected(each, false);
    setSelected(all, true);
    renderEpisodes();
  }, { signal: controller.signal });

  const update = (next: TemporalData): void => {
    data = next;
    const pol = pollutant();
    const reference = REFERENCES[pol];
    const longest = data.episodes_summary.longest_episode;
    const most = data.episodes_summary.most_episodes;

    const subtitle = summary.root.querySelector('.panel-header p');
    if (subtitle) {
      subtitle.textContent = `${pol} · ${data.meta.date_range.start ? period(data.meta.date_range.start, data.meta.date_range.end) : 'Tidak ada tanggal pilihan'}`;
    }

    const indicators = episodeIndicators(data.episodes_summary);
    metrics.replaceChildren(
      metric('Episode Terpanjang', indicators.longestDays === null ? '—' : number(indicators.longestDays), 'hari', longest ? `${longest.station} · ${period(longest.start, longest.end)}` : indicators.emptyContext),
      metric('Episode Terbanyak', indicators.mostCount === null ? '—' : number(indicators.mostCount), 'episode', most?.station ?? indicators.emptyContext),
      metric('Acuan Harian', number(reference.daily), 'µg/m³', reference.hours === 8 ? 'Maksimum rata-rata 8 jam' : 'Rata-rata 24 jam'),
      metric('Jeda Penggabungan', '1', 'hari', 'Hanya hari terukur; data hilang memutus episode'),
    );

    const available = Object.values(data.timeseries.stations).some(values => values.some(value => value !== null))
      || Object.values(data.diurnal['Pilihan'] ?? {}).some(value => value !== null)
      || Object.values(data.heatmap['Pilihan'] ?? {}).some(hours => Object.values(hours).some(value => value !== null));

    empty.hidden = available;
    for (const item of [timePanel.root, heatmap.root, seasonalPanel.root, episodePanel.root]) {
      item.hidden = !available;
    }

    const timeSubtitle = timePanel.root.querySelector('.panel-header p');
    if (timeSubtitle) {
      timeSubtitle.textContent = `${pol} · siklus diurnal per jam (00–23 WIB) dan deret waktu harian stasiun pilihan`;
    }

    const seasonalSubtitle = seasonalPanel.root.querySelector('.panel-header p');
    if (seasonalSubtitle) {
      seasonalSubtitle.textContent = `${pol} · variasi konsentrasi rata-rata per bulan kalender (Januari–Desember) lintas tahun 2024–2026`;
    }

    const epSubtitle = episodePanel.root.querySelector('.panel-header p');
    if (epSubtitle) {
      epSubtitle.textContent = `${pol} >${number(reference.daily)} µg/m³ · ${reference.hours} jam · periode pilihan`;
    }

    renderProfile();
    const map = data.heatmap['Pilihan'] ?? {};
    matrix.update(
      Array.from({ length: 7 }, (_, day) => Array.from({ length: 24 }, (_, hour) => map[String(day)]?.[String(hour)] ?? null)),
      'Seluruh stasiun pilihan',
    );
    renderTrend();
    renderSeasonality();
    renderEpisodes();
    renderSeverity();

    root.dataset['pollutant'] = pol;
  };

  update(initial);

  return {
    update,
    destroy: () => {
      controller.abort();
      profileChart.destroy();
      matrix.destroy();
      series.destroy();
      seasonalChart.destroy();
      episodeChart.destroy();
      severityChart.destroy();
      root.remove();
    },
  };
}
