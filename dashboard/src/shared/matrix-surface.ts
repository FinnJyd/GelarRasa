import { element } from './dom';

export function matrixSurface(host: HTMLElement, label: string) {
  const controller = new AbortController();
  const root = element('div', 'analysis-matrix');
  const viewport = element('div', 'analysis-matrix-scroll');
  viewport.tabIndex = 0; viewport.setAttribute('role', 'region'); viewport.setAttribute('aria-label', label);
  const canvas = element('canvas'); canvas.setAttribute('role', 'img'); canvas.setAttribute('aria-label', label);
  const tooltip = element('div', 'analysis-matrix-tooltip'); tooltip.hidden = true;
  const legend = element('div', 'analysis-legend');
  const alternative = element('p', 'sr-only');
  viewport.append(canvas); root.append(viewport, tooltip, legend, alternative); host.append(root);
  const hide = (): void => { tooltip.hidden = true; };
  viewport.addEventListener('scroll', hide, { signal: controller.signal });
  return {
    root, viewport, canvas, legend, alternative,
    size(width: number, height: number): CanvasRenderingContext2D | null {
      const ratio = window.devicePixelRatio || 1;
      canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
      canvas.style.width = `${width}px`; canvas.style.height = `${height}px`;
      const context = canvas.getContext('2d'); context?.setTransform(ratio, 0, 0, ratio, 0, 0);
      return context;
    },
    show(event: PointerEvent, text: string): void {
      tooltip.textContent = text; tooltip.hidden = false;
      const bounds = root.getBoundingClientRect();
      tooltip.style.left = `${Math.max(0, Math.min(event.clientX - bounds.left + 12, root.clientWidth - tooltip.offsetWidth))}px`;
      tooltip.style.top = `${event.clientY - bounds.top + 12}px`;
    },
    hide,
    destroy(): void { controller.abort(); root.remove(); },
  };
}

export function matrixLegend(host: HTMLElement, title: string, entries: readonly (readonly [string, string])[]): void {
  host.append(element('span', '', title));
  for (const [label, color] of entries) {
    const item = element('span'), swatch = element('i', 'swatch');
    swatch.style.backgroundColor = color; swatch.setAttribute('aria-hidden', 'true');
    item.append(swatch, document.createTextNode(label)); host.append(item);
  }
}
