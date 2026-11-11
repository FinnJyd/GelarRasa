import type { Feature } from '../data/types';
import { button, element, image } from '../shared/dom';
import { icon } from '../shared/icons';
import { ROUTES } from '../shared/routes';
import { toggleTheme } from '../shared/theme';

export const APPLICATION_TITLE = 'DA2026_Dashboard_NasiBakarCumiHitamPakKris_AlfinJayadi';

export function createShell(features: readonly Feature[], onNavigate: (feature: Feature) => void, openMethodology: (invoker: HTMLElement) => void): {
  host: HTMLElement;
  filterHost: HTMLElement;
  announce: (text: string) => void;
  activate: (feature: Feature | null) => void;
  destroy: () => void;
} {
  const controller = new AbortController();
  const listen = { signal: controller.signal };
  let drawerFocusFrame = 0;
  const root = element('div', 'app-layout');
  const sidebar = element('aside', 'sidebar');
  sidebar.id = 'app-sidebar';
  const brand = element('div', 'sidebar-brand');
  brand.setAttribute('role', 'img');
  brand.setAttribute('aria-label', 'PRANA');
  brand.append(image('../assets/Prana Emblem.png', '', 'brand-emblem'), image('../assets/Prana Textual.png', '', 'brand-wordmark'));
  const collapse = button('', 'icon-button sidebar-collapse');
  collapse.setAttribute('aria-label', 'Perkecil navigasi');
  collapse.setAttribute('aria-expanded', 'true');
  collapse.setAttribute('aria-controls', 'app-sidebar');
  collapse.append(icon('chevron'));
  const brandRow = element('div', 'sidebar-brand-row');
  brandRow.append(brand, collapse);
  const navigation = element('nav', 'navigation');
  navigation.setAttribute('aria-label', 'Bagian dashboard');
  const navigationHeading = element('p', 'nav-caption', 'ANALISIS');
  const navButtons = new Map<string, HTMLAnchorElement>();
  const main = element('main', 'main-content');
  main.id = 'dashboard-content';
  main.tabIndex = -1;
  const backdrop = button('', 'sidebar-backdrop');
  backdrop.setAttribute('aria-label', 'Tutup navigasi');
  backdrop.tabIndex = -1;
  const mobileMenu = button('', 'icon-button mobile-menu');
  mobileMenu.setAttribute('aria-label', 'Buka navigasi');
  mobileMenu.setAttribute('aria-controls', sidebar.id);
  mobileMenu.setAttribute('aria-expanded', 'false');
  mobileMenu.append(icon('chevron'));

  function closeDrawer(animate = true): void {
    cancelAnimationFrame(drawerFocusFrame);
    sidebar.inert = matchMedia('(max-width: 767px)').matches;
    if (!animate) root.classList.remove('drawer-motion');
    root.classList.remove('drawer-open');
    mobileMenu.setAttribute('aria-expanded', 'false');
    workspace.inert = false;
    sidebar.removeAttribute('role');
    sidebar.removeAttribute('aria-modal');
    sidebar.removeAttribute('aria-label');
    document.body.style.overflow = '';
    collapse.setAttribute('aria-label', root.classList.contains('rail-navigation') ? 'Perbesar navigasi' : 'Perkecil navigasi');
    collapse.replaceChildren(icon('chevron'));
  }

  for (const feature of features) {
    const item = element('a', 'nav-item');
    item.href = ROUTES[feature.id];
    item.dataset['feature'] = feature.id;
    item.setAttribute('aria-label', feature.title);
    item.title = feature.title;
    item.append(icon(feature.icon), element('span', 'nav-label', feature.title));
    item.addEventListener('click', event => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      closeDrawer();
      onNavigate(feature);
      main.focus();
    }, listen);
    navButtons.set(feature.id, item);
    navigation.append(item);
  }
  const logo = element('div', 'competition-brand');
  logo.append(image('../assets/Logo GELAR RASA Open.png', 'Gelar Rasa 2026', 'competition-logo'), image('../assets/Logo GELAR RASA Closed.png', 'Gelar Rasa 2026', 'competition-logo-compact'));
  const sidebarBottom = element('div', 'sidebar-bottom');
  sidebarBottom.append(element('p', 'sidebar-context', 'Kualitas udara.\nKesehatan bersama.'), logo);
  sidebar.append(brandRow, navigationHeading, navigation, sidebarBottom);
  const workspace = element('div', 'workspace');
  const topbar = element('header', 'topbar');
  const titleArea = element('div', 'topbar-title');
  titleArea.append(element('p', 'eyebrow', 'PRANA / AIR & HEALTH'), element('h1', 'application-title', APPLICATION_TITLE));
  const actions = element('div', 'topbar-actions');
  const theme = button('', 'button theme-button');
  theme.append(icon('sun'), element('span', '', 'Tema'));
  theme.setAttribute('aria-label', 'Ganti tema tampilan');
  theme.setAttribute('aria-pressed', String(document.documentElement.dataset['theme'] === 'dark'));
  theme.addEventListener('click', () => theme.setAttribute('aria-pressed', String(toggleTheme() === 'dark')), listen);
  const methodology = button('', 'button');
  methodology.append(icon('info'), element('span', '', 'Metodologi'));
  methodology.addEventListener('click', () => openMethodology(methodology), listen);
  actions.append(theme, methodology);
  topbar.append(mobileMenu, titleArea, actions);
  const intro = element('header', 'page-intro');
  const breadcrumb = element('p', 'eyebrow', 'DASHBOARD / IKHTISAR NASIONAL');
  const introLine = element('div', 'intro-line');
  const sectionTitle = element('h2');
  const badge = element('span', 'badge', 'Dataset sintetis');
  introLine.append(sectionTitle, badge);
  const question = element('p', 'page-question');
  intro.append(breadcrumb, introLine, question);
  const filterHost = element('div');
  const host = element('div', 'feature-host');
  const announcement = element('p', 'sr-only');
  announcement.setAttribute('role', 'status');
  announcement.setAttribute('aria-live', 'polite');
  main.append(intro, filterHost, host, announcement);
  workspace.append(topbar, main);
  root.append(sidebar, backdrop, workspace);
  document.getElementById('app')?.replaceChildren(root);
  collapse.addEventListener('click', () => {
    if (matchMedia('(max-width: 767px)').matches) { closeDrawer(); mobileMenu.focus(); return; }
    const collapsed = root.classList.toggle('rail-navigation');
    collapse.setAttribute('aria-expanded', String(!collapsed));
    collapse.setAttribute('aria-label', collapsed ? 'Perbesar navigasi' : 'Perkecil navigasi');
  }, listen);
  mobileMenu.addEventListener('click', () => {
    if (root.classList.contains('drawer-open')) { closeDrawer(); return; }
    root.classList.add('drawer-motion', 'drawer-open');
    mobileMenu.setAttribute('aria-expanded', 'true');
    sidebar.inert = false;
    sidebar.setAttribute('role', 'dialog');
    sidebar.setAttribute('aria-modal', 'true');
    sidebar.setAttribute('aria-label', 'Navigasi dashboard');
    workspace.inert = true;
    document.body.style.overflow = 'hidden';
    collapse.setAttribute('aria-label', 'Tutup navigasi');
    collapse.replaceChildren(icon('chevron'));
    drawerFocusFrame = requestAnimationFrame(() => {
      if (root.classList.contains('drawer-open')) collapse.focus({ preventScroll: true });
    });
  }, listen);
  backdrop.addEventListener('click', () => { closeDrawer(); mobileMenu.focus(); }, listen);
  document.addEventListener('keydown', event => {
    if (!root.classList.contains('drawer-open')) return;
    if (event.key === 'Escape') { closeDrawer(); mobileMenu.focus(); }
    if (event.key === 'Tab') {
      const controls = [...sidebar.querySelectorAll<HTMLElement>('button, a[href]')];
      const first = controls[0];
      const last = controls.at(-1);
      if (!sidebar.contains(document.activeElement)) {
        event.preventDefault();
        (event.shiftKey ? last : first)?.focus();
      } else if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }
  }, listen);
  const narrowScreen = matchMedia('(max-width: 767px)');
  sidebar.inert = narrowScreen.matches;
  narrowScreen.addEventListener('change', () => closeDrawer(false), listen);
  sidebar.addEventListener('transitionend', event => {
    if (event.target === sidebar && root.classList.contains('drawer-open') && !sidebar.contains(document.activeElement)) {
      collapse.focus({ preventScroll: true });
    }
    if (event.target === sidebar && !root.classList.contains('drawer-open')) {
      root.classList.remove('drawer-motion');
    }
  }, listen);
  return {
    host, filterHost,
    announce: text => { announcement.textContent = text; },
    activate: feature => {
      sectionTitle.textContent = feature?.title ?? 'Halaman tidak ditemukan';
      question.textContent = feature?.question ?? 'Pilih bagian dashboard melalui navigasi.';
      breadcrumb.textContent = feature ? `DASHBOARD / ${feature.title.toLocaleUpperCase('id-ID')}` : 'DASHBOARD / 404';
      for (const [id, item] of navButtons) {
        if (id === feature?.id) item.setAttribute('aria-current', 'page');
        else item.removeAttribute('aria-current');
      }
      filterHost.hidden = feature?.id !== 'overview';
    },
    destroy: () => { closeDrawer(false); controller.abort(); root.remove(); },
  };
}
