import { pauseChartResize, resumeChartResize } from './chart-lifecycle';

type Listener = () => void;

let depth = 0;
let pending = 0;
const endListeners = new Set<Listener>();

export function beginLayoutFollow(): void {
  depth += 1;
  if (depth === 1) {
    document.body.classList.add('layout-follow');
    pauseChartResize();
  }
}

export function endLayoutFollow(): void {
  if (!depth) return;
  depth -= 1;
  if (depth) return;
  document.body.classList.remove('layout-follow');
  resumeChartResize();
  for (const listener of [...endListeners]) listener();
}

// Single-slot scheduler: a new follow window cancels the previous pending one (never leaks depth),
// so rapid open/close or toggle/collapse combinations always settle back to the resting layout.
export function followLayout(durationMs: number): void {
  cancelLayoutFollow();
  beginLayoutFollow();
  if (durationMs <= 0) { endLayoutFollow(); return; }
  pending = window.setTimeout(() => { pending = 0; endLayoutFollow(); }, durationMs);
}

export function cancelLayoutFollow(): void {
  if (!pending) return;
  window.clearTimeout(pending);
  pending = 0;
  endLayoutFollow();
}

export function layoutFollowActive(): boolean {
  return depth > 0;
}

export function onLayoutFollowEnd(listener: Listener): () => void {
  endListeners.add(listener);
  return () => { endListeners.delete(listener); };
}