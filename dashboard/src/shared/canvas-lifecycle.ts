import type { UpdatePayload } from 'vite';

export function manageCanvas(host: HTMLElement, render: () => void): { destroy: () => void } {
  const observer = new MutationObserver(render);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  const resize = new ResizeObserver(render);
  resize.observe(host);
  const refreshStyles = (update: UpdatePayload): void => {
    if (update.updates.some(item => item.type === 'css-update')) render();
  };
  import.meta.hot?.on('vite:afterUpdate', refreshStyles);
  let active = true;
  void document.fonts.ready.then(() => { if (active) render(); });
  return { destroy: () => { active = false; observer.disconnect(); resize.disconnect(); import.meta.hot?.off('vite:afterUpdate', refreshStyles); } };
}
