import { mountResponseMatrix } from './response-matrix';
import { mountNetworkRank } from './network-view';
import { mountSimulation } from '../../shared/admissions';
import { admissionBaseline } from './planning';
import type { FilterState } from '../../data/types';
import { button, element, emptyState } from '../../shared/dom';
import { number, period, shortCity } from '../../shared/format';
import { panel } from '../../shared/panel';
import { icon } from '../../shared/icons';
import { recommendActions } from './actions';
import { policyMap } from './map';
import { summarizePolicy } from './model';
import type { PolicyData } from './types';

export function mountPolicyView(host: HTMLElement, data: PolicyData, initial: FilterState): { update: (filters: FilterState) => void; destroy: () => void } {
  const controller = new AbortController();
  const root = element('div', 'policy-dashboard');
  const priorities = panel('Prioritas Tindakan', 'Usulan tindak lanjut berdasarkan kondisi pemantauan dan catatan layanan.');
  const actions = element('div', 'policy-actions'); priorities.body.append(actions);
  const response = panel('Matriks Respons Kesehatan', 'Sintesis pola historis PM2.5 dan kelompok usia · bukan ambang peringatan klinis');
  const simulator = panel('Asumsi Kapasitas Manual', 'Uji kenaikan admisi pernapasan umum sebagai asumsi pengguna.');
  const rankPanel = panel('Prioritas Studi Ekspansi AQMS', 'Uji bobot baseline PM2.5, aktivitas lalu lintas, dan jarak ke stasiun terdekat.');
  const simulatorScope = element('p', 'panel-footnote'); simulator.body.append(simulatorScope);
  const network = panel('Lokasi dan Bukti', 'Jaringan terpasang dan catatan pendukung untuk meninjau usulan tindakan.');
  const networkLegend = element('p', 'panel-footnote policy-network-legend', 'Status master: Active · Intermittent · Defective. Titik kecil abu-abu adalah referensi di luar wilayah pilihan.');
  const mapHost = element('div');
  const coverageControl = element('div', 'filter-field');
  const coverageLabel = element('label', '', 'Radius ilustrasi pemantauan (km)'); coverageLabel.htmlFor = 'policy-radius';
  const radius = element('input'); radius.id = coverageLabel.htmlFor; radius.type = 'range'; radius.min = '10'; radius.max = '300'; radius.value = '50';
  const radiusValue = element('output'); radiusValue.htmlFor = radius.id;
  const coverageNote = element('p', 'panel-footnote');
  coverageControl.append(coverageLabel, radiusValue, radius, coverageNote);
  const sortBar = element('div', 'policy-network-sort');
  sortBar.append(element('span', '', 'Urutkan bukti:'));
  const coverageSort = button('Cakupan terendah'), distanceSort = button('Jarak terbesar'); sortBar.append(coverageSort, distanceSort);
  const tableHost = element('div', 'policy-table-wrap'); tableHost.tabIndex = 0; tableHost.setAttribute('role', 'region'); tableHost.setAttribute('aria-label', 'Bukti penguatan jaringan stasiun');
  const tableDisclosure = element('details', 'policy-table-disclosure');
  const tableSummary = element('summary');
  const tableLabel = element('span', 'policy-table-label');
  const tableCount = element('span', 'muted');
  tableLabel.append(element('strong', '', 'Data stasiun'), tableCount);
  tableSummary.append(tableLabel, icon('down'));
  const tableBody = element('div', 'policy-table-body');
  tableBody.append(sortBar, tableHost);
  tableDisclosure.append(tableSummary, tableBody);
  network.body.append(networkLegend, coverageControl, mapHost, tableDisclosure,
    element('p', 'panel-footnote', 'Jarak antarstasiun bukan radius cakupan atau bukti populasi tidak terlayani. Penempatan baru memerlukan survei lokasi; tidak ada koordinat baru yang diasumsikan.'));
  root.append(response.root, simulator.root, rankPanel.root, network.root, priorities.root); host.replaceChildren(root);
  const simulation = mountSimulation(simulator.body);
  const responseMatrix = mountResponseMatrix(response.body);
  const ranking = mountNetworkRank(rankPanel.body, data.stations.map(station => station.code));
  let map: ReturnType<typeof policyMap> | null = null;
  try { map = policyMap(mapHost, data); } catch { mapHost.append(emptyState('Peta tidak tersedia', 'Bukti lokasi tetap tersedia pada daftar stasiun.')); }
  function updateCoverage(): void {
    const km = Number(radius.value); radiusValue.textContent = `${km} km · asumsi ilustrasi`;
    coverageNote.textContent = 'Lingkaran adalah asumsi radius geografis, bukan jangkauan alat atau cakupan penduduk. Jarak antartitik tetap dihitung terhadap seluruh jaringan; wilayah di luar lingkaran belum membuktikan kekosongan pemantauan.';
    map?.coverage(km);
  }
  radius.addEventListener('input', updateCoverage, { signal: controller.signal });
  let state = initial;
  let summary = summarizePolicy(data, state);
  let sort: 'coverage' | 'distance' = 'coverage';
  const listen = { signal: controller.signal };
  // Table handlers use one delegated listener so repeated filtering retains no row references.
  tableHost.addEventListener('click', event => {
    if (event.target instanceof HTMLElement) {
      const control = event.target.closest<HTMLButtonElement>('button[data-station]');
      if (control?.dataset['station']) map?.focus(control.dataset['station']);
    }
  }, { signal: controller.signal });
  function renderActions(): void {
    actions.replaceChildren();
    const proposed = recommendActions(summary);
    for (const action of proposed) {
      const card = element('article', 'policy-action'); card.dataset['action'] = action.id;
      card.append(element('h4', '', action.title), element('p', 'policy-action-locations', action.locations));
      const facts = element('dl');
      for (const [label, text] of [['Dasar data', action.evidence], ['Langkah awal', action.step], ['Pemantauan tindak lanjut', action.followUp]]) {
        facts.append(element('dt', '', label), element('dd', '', text));
      }
      card.append(facts); actions.append(card);
    }
    if (!proposed.length) actions.append(emptyState('Tidak ada lokasi sesuai pilihan', 'Pilih wilayah lain untuk melihat bukti dan usulan tindakan.'));
  }
  function renderNetwork(): void {
    tableCount.textContent = `${summary.rows.length} stasiun pilihan`;
    coverageSort.setAttribute('aria-pressed', String(sort === 'coverage')); distanceSort.setAttribute('aria-pressed', String(sort === 'distance'));
    const rows = [...summary.rows].sort((a, b) => (sort === 'coverage' ? a.valid - b.valid : b.station.nearest.km - a.station.nearest.km) || a.station.code.localeCompare(b.station.code));
    const table = element('table', 'station-table');
    table.append(element('caption', '', `${rows.length} stasiun pilihan · jarak ke jaringan penuh ${data.stations.length} stasiun`));
    const head = element('thead'), header = element('tr');
    for (const label of ['Stasiun / konteks', 'Status master', `Hari ${state.pollutant ?? 'PM2.5'}`, 'Baris QC dikeluarkan', 'Stasiun terdekat', 'Peninjauan']) { const th = element('th', '', label); th.scope = 'col'; header.append(th); }
    head.append(header);
    const body = element('tbody');
    for (const row of rows) {
      const tr = element('tr');
      const identity = element('td'); identity.append(element('strong', '', row.station.code), element('span', 'policy-cell-detail', shortCity(row.station.city)), element('span', 'policy-cell-detail', row.station.siteType));
      const validity = element('td', '', `${row.valid} / ${summary.dates.length}`);
      if (row.reason) validity.append(element('span', 'policy-cell-detail', row.reason));
      const nearest = element('td', '', `${number(row.station.nearest.km)} km`); nearest.dataset['nearestKm'] = String(row.station.nearest.km); nearest.append(element('span', 'policy-cell-detail', row.station.nearest.code));
      const action = element('td');
      action.append(element('span', 'policy-cell-detail', row.station.status === 'Defective' ? 'Tinjau instrumen' : row.station.unavailable.length ? 'Verifikasi satuan' : row.station.status === 'Intermittent' ? 'Tinjau kesinambungan data' : 'Lihat bukti lokasi'));
      const locate = button('Lihat di peta'); locate.dataset['station'] = row.station.code; locate.disabled = map === null; action.append(locate);
      tr.append(identity, element('td', '', row.station.status), validity, element('td', '', `${number(row.excluded)} / ${number(row.recorded)}`), nearest, action); body.append(tr);
    }
    table.append(head, body); tableHost.replaceChildren(table);
  }
  coverageSort.addEventListener('click', () => { sort = 'coverage'; renderNetwork(); }, listen);
  distanceSort.addEventListener('click', () => { sort = 'distance'; renderNetwork(); }, listen);
  function render(): void {
    summary = summarizePolicy(data, state);
    const start = summary.dates[0], end = summary.dates.at(-1);
    simulatorScope.textContent = `${summary.rows.length} faskes · ${start && end ? period(start, end) : 'Periode tidak tersedia'} · Pernapasan umum · Kapasitas tercatat`;
    simulation.update(admissionBaseline(summary));
    responseMatrix.update(summary, state); ranking.update(summary);
    renderActions(); renderNetwork(); map?.update(summary.rows); updateCoverage();
  }
  render();
  return { update: filters => { state = filters; render(); }, destroy: () => { controller.abort(); simulation.destroy(); responseMatrix.destroy(); ranking.destroy(); map?.destroy(); root.remove(); } };
}
