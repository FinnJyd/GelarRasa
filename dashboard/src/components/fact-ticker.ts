import { AIR_POLLUTION_FACTS } from '../data/air-pollution-facts';
import { button, element } from '../shared/dom';

export function createFactTicker(): { root: HTMLElement; destroy: () => void } {
  const controller = new AbortController();
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const root = element('aside', 'fact-ticker');
  root.setAttribute('aria-label', 'Fakta umum polusi udara');
  const label = element('span', 'fact-ticker-label', 'Fakta');
  const viewport = element('div', 'fact-ticker-viewport');
  viewport.tabIndex = 0;
  viewport.setAttribute('role', 'region');
  viewport.setAttribute('aria-label', 'Fakta kesehatan; geser horizontal saat animasi dinonaktifkan');
  const track = element('div', 'fact-ticker-track');
  const list = element('ul', 'fact-ticker-list');
  list.append(...AIR_POLLUTION_FACTS.map(fact => element('li', '', fact)));
  const duplicate = list.cloneNode(true);
  if (duplicate instanceof HTMLElement) {
    duplicate.setAttribute('aria-hidden', 'true');
    duplicate.classList.add('fact-ticker-copy');
  }
  track.append(list, duplicate);
  const toggle = button('Jeda', 'fact-ticker-toggle');
  toggle.setAttribute('aria-label', 'Jeda ticker fakta');
  toggle.setAttribute('aria-pressed', 'false');
  viewport.append(track);
  root.append(label, viewport, toggle);
  let paused = false;
  const syncMotion = (): void => {
    root.dataset['reducedMotion'] = String(motion.matches);
    toggle.hidden = motion.matches;
  };
  const observer = new ResizeObserver(() => {
    const width = list.getBoundingClientRect().width;
    if (width > 0) track.style.setProperty('--fact-duration', `${Math.max(20, width / 40)}s`);
  });
  observer.observe(list);
  motion.addEventListener('change', syncMotion, { signal: controller.signal });
  toggle.addEventListener('click', () => {
    paused = !paused;
    root.dataset['paused'] = String(paused);
    toggle.textContent = paused ? 'Lanjut' : 'Jeda';
    toggle.setAttribute('aria-label', paused ? 'Lanjutkan ticker fakta' : 'Jeda ticker fakta');
    toggle.setAttribute('aria-pressed', String(paused));
  }, { signal: controller.signal });
  syncMotion();
  return {
    root,
    destroy: () => {
      controller.abort();
      observer.disconnect();
      root.remove();
    },
  };
}
