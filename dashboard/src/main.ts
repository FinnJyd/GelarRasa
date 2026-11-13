import { loadDashboard } from './data/load';
import { createAnalysisCache } from './data/analysis-cache';
import type { AnalysisCache } from './data/analysis-cache';
import type { DashboardData, Feature } from './data/types';
import { createFilters } from './components/filters';
import { createMethodology } from './components/methodology';
import { createOpening } from './components/opening';
import { createShell } from './components/shell';
import { mountCompliance } from './features/compliance';
import { mountTemporal } from './features/temporal';
import { mountDrivers } from './features/drivers';
import { mountHealth } from './features/health';
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
let healthView: ReturnType<typeof mountHealth> | null = null;
let complianceView: ReturnType<typeof mountCompliance> | null = null;
let temporalView: ReturnType<typeof mountTemporal> | null = null;
let driversView: ReturnType<typeof mountDrivers> | null = null;
let analysisCache: AnalysisCache | null = null;
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
const healthFeature: Feature = {
  id: 'health', title: 'Dampak Kesehatan', icon: 'heart',
  question: 'Berapa jeda waktu (lag 0–7 hari) paparan PM2.5 terhadap lonjakan ISPA, dan kelompok usia mana yang paling rentan menanggung beban admisi faskes?',
  mount: host => {
    if (!data) return () => undefined;
    healthView = mountHealth(host, data.stations, filters?.state() ?? defaultFilters());
    return () => { healthView?.destroy(); healthView = null; };
  },
};
const complianceFeature: Feature = {
  id: 'compliance', title: 'Kepatuhan Regulasi', icon: 'shield',
  question: 'Sejauh mana stasiun memenuhi acuan kualitas udara, seberapa sering terjadi pelampauan, dan bagaimana perubahan kepatuhannya antar-tahun?',
  mount: host => {
    if (!data) return () => undefined;
    complianceView = mountCompliance(host, data.stations, filters?.state() ?? defaultFilters());
    return () => { complianceView?.destroy(); complianceView = null; };
  },
};
const temporalFeature: Feature = {
  id:'temporal',title:'Pola Waktu',icon:'clock',
  question:'Kapan jam dan periode puncak lonjakan polutan terjadi dalam siklus diurnal 24 jam, dan bagaimana anomali musiman karhutla mengubah drastis profil polusi?',
  mount:host=>{
    if(!analysisCache)return()=>undefined;
    temporalView=mountTemporal(host,analysisCache,filters?.state()??defaultFilters());
    return()=>{temporalView?.destroy();temporalView=null;};
  },
};
const driversFeature: Feature = {
  id:'drivers',title:'Faktor Pemicu',icon:'wind',
  question:'Faktor meteorologi, arah angin (mawar polusi), dan aktivitas antropogenik apa yang menjadi pemicu utama konsentrasi ekstrem polutan di berbagai zonasi?',
  mount:host=>{
    if(!analysisCache)return()=>undefined;
    driversView=mountDrivers(host,analysisCache,filters?.state()??defaultFilters());
    return()=>{driversView?.destroy();driversView=null;};
  },
};
const features = [overviewFeature, complianceFeature, temporalFeature, driversFeature, healthFeature, recommendations];
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
  filters?.setScope(feature.id);
  if (filters) filters.root.open = false;
  shell.activate(feature);
  if (feature.id !== 'recommendations' && !data) {
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
  if (active && active.id !== 'recommendations') renderLoading();
  try {
    const loaded = await loadDashboard(currentRequest.signal);
    if (currentRequest.signal.aborted) return;
    data = loaded;
    analysisCache?.destroy();
    analysisCache = createAnalysisCache(loaded.stations, { start: loaded.start, end: loaded.end });
    filters?.destroy();
    filters = createFilters(loaded, (state, announcement) => {
      void analysisCache?.prepare(state).catch(() => undefined);
      overview?.update(state);
      healthView?.update(state);
      complianceView?.update(state);
      temporalView?.update(state);
      driversView?.update(state);
      const count = filterStations(loaded.stations, state).length;
      shell.announce(`${announcement}${count} stasiun sesuai pilihan. ${active?.id === 'recommendations' ? 'Pilihan tersimpan; analisis rekomendasi belum tersedia.' : 'Analisis pada tab aktif diperbarui.'}`);
    });
    shell.filterHost.replaceChildren(filters.root);
    if (active) filters.setScope(active.id);
    void analysisCache.prepare(filters.state()).catch(() => undefined);
    request = null;
    await opening.finish();
    if (lifetime.signal.aborted) return;
    if (active && active.id !== 'recommendations') navigate(active);
  } catch (error: unknown) {
    if (currentRequest.signal.aborted) return;
    request = null;
    console.error('Dashboard export could not be loaded:', error);
    await opening.finish();
    if (!lifetime.signal.aborted && active && active.id !== 'recommendations') renderFailure();
  }
}

function destroy(): void {
  request?.abort();
  opening.destroy();
  router.destroy();
  disposeFeature?.();
  analysisCache?.destroy();
  filters?.destroy();
  methodology.destroy();
  shell.destroy();
  lifetime.abort();
}

window.addEventListener('pagehide', event => { if (!event.persisted) destroy(); }, { signal: lifetime.signal });
void load();
