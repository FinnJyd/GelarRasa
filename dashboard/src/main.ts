import { loadDashboard } from './data/load';
import type { DashboardData, Feature } from './data/types';
import { createFilters } from './components/filters';
import { createMethodology } from './components/methodology';
import { createOpening } from './components/opening';
import { createShell } from './components/shell';
import { compliance } from './features/compliance';
import { temporal } from './features/temporal';
import { drivers } from './features/drivers';
import { health } from './features/health';
import { recommendations } from './features/recommendations';
import { mountOverview } from './features/overview/view';
import { defaultFilters, filterStations } from './features/overview/model';
import { button, emptyState } from './shared/dom';
import { createRouter, resolveRoute } from './shared/routes';
import { initializeTheme } from './shared/theme';

initializeTheme();
const opening = createOpening();
const lifetime = new AbortController();
let data: DashboardData | null = null;
let filters: ReturnType<typeof createFilters> | null = null;
let overview: ReturnType<typeof mountOverview> | null = null;
let disposeFeature: (() => void) | null = null;
let request: AbortController | null = null;
let active: Feature | null = null;
const methodology = createMethodology(() => data);
const overviewFeature: Feature = {
  id: 'overview', title: 'Ikhtisar Nasional', icon: 'overview',
  question: "Bagaimana status kualitas udara nasional dan seberapa parah krisis polusi terhadap beban kesehatan masyarakat di 27 stasiun pemantau Indonesia?",
  mount: host => {
    if (!data) return () => undefined;
    overview = mountOverview(host, data, filters?.state() ?? defaultFilters(), invoker => methodology.open(invoker));
    return () => { overview?.destroy(); overview = null; };
  },
};
const features = [overviewFeature, compliance, temporal, drivers, health, recommendations];
const shell = createShell(features, feature => router.go(feature.id), invoker => methodology.open(invoker));
const router = createRouter(id => {
  const feature = features.find(item => item.id === id);
  if (feature) navigate(feature);
  else renderNotFound();
});
const initial = features.find(item => item.id === resolveRoute(location.pathname));
if (initial) navigate(initial);
else renderNotFound();

function renderLoading(): void {
  disposeFeature?.();
  disposeFeature = null;
  const loading = emptyState('Memuat ringkasan stasiun…', 'Menyiapkan visualisasi kualitas udara.');
  loading.setAttribute('role', 'status');
  shell.host.replaceChildren(loading);
}

function navigate(feature: Feature): void {
  disposeFeature?.();
  disposeFeature = null;
  active = feature;
  filters?.close();
  shell.activate(feature);
  if (feature.id === 'overview' && !data) {
    if (request) renderLoading();
    else renderFailure();
    return;
  }
  disposeFeature = feature.mount(shell.host);
}

function renderNotFound(): void {
  disposeFeature?.();
  disposeFeature = null;
  active = null;
  shell.activate(null);
  filters?.close();
  shell.filterHost.hidden = true;
  const content = emptyState('Halaman tidak ditemukan', 'Pilih bagian dashboard melalui navigasi.');
  const home = button('Buka ikhtisar', 'button button-primary');
  const controller = new AbortController();
  home.addEventListener('click', () => router.go('overview'), { signal: controller.signal });
  content.append(home);
  shell.host.replaceChildren(content);
  disposeFeature = () => { controller.abort(); content.remove(); };
}

function renderFailure(): void {
  disposeFeature?.();
  const controller = new AbortController();
  const state = emptyState('Ringkasan belum dapat dimuat', 'Periksa koneksi dan ketersediaan berkas ekspor. Tidak ada data pengganti yang ditampilkan.');
  state.setAttribute('role', 'alert');
  const retry = button('Coba lagi', 'button button-primary');
  retry.addEventListener('click', () => { void load(); }, { once: true, signal: controller.signal });
  disposeFeature = () => { controller.abort(); state.remove(); };
  state.append(retry);
  shell.host.replaceChildren(state);
}

async function load(): Promise<void> {
  request?.abort();
  const currentRequest = new AbortController();
  request = currentRequest;
  if (active?.id === 'overview') renderLoading();
  try {
    const loaded = await loadDashboard(currentRequest.signal);
    if (currentRequest.signal.aborted) return;
    data = loaded;
    filters?.destroy();
    filters = createFilters(loaded, (state, announcement) => {
      overview?.update(state);
      const count = filterStations(loaded.stations, state).length;
      shell.announce(`${announcement}${count} stasiun sesuai pilihan. Ringkasan, distribusi, peringkat, tabel, dan peta diperbarui.`);
    });
    shell.filterHost.replaceChildren(filters.root);
    request = null;
    await opening.finish();
    if (lifetime.signal.aborted) return;
    if (active?.id === 'overview') navigate(overviewFeature);
  } catch (error: unknown) {
    if (currentRequest.signal.aborted) return;
    request = null;
    console.error('Dashboard export could not be loaded:', error);
    await opening.finish();
    if (!lifetime.signal.aborted && active?.id === 'overview') renderFailure();
  }
}

function destroy(): void {
  request?.abort();
  opening.destroy();
  router.destroy();
  disposeFeature?.();
  filters?.destroy();
  methodology.destroy();
  shell.destroy();
  lifetime.abort();
}

window.addEventListener('pagehide', event => { if (!event.persisted) destroy(); }, { signal: lifetime.signal });
void load();
