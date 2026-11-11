export function createOpening(): {
  ready: Promise<void>;
  finish: () => Promise<void>;
  destroy: () => void;
} {
  const screen = document.getElementById('opening-screen');
  const app = document.getElementById('app');
  const skip = document.getElementById('skip-opening');
  if (!screen || !app || !skip) throw new Error('Opening markup is missing.');
  const controller = new AbortController();
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const started = performance.now();
  let leaving = false;
  let disposed = false;
  let finishTimer: ReturnType<typeof setTimeout> | undefined;
  let exitTimer: ReturnType<typeof setTimeout> | undefined;
  let resolveReady: () => void = () => undefined;
  const ready = new Promise<void>(resolve => { resolveReady = resolve; });
  app.inert = true;

  const remove = (): void => {
    if (disposed) return;
    disposed = true;
    clearTimeout(deadline);
    clearTimeout(finishTimer);
    clearTimeout(exitTimer);
    controller.abort();
    const shouldRestoreFocus = screen.contains(document.activeElement);
    app.inert = false;
    document.body.removeAttribute('data-opening');
    screen.remove();
    resolveReady();
    if (shouldRestoreFocus) document.getElementById('dashboard-content')?.focus({ preventScroll: true });
  };
  const reveal = (): void => {
    if (leaving || disposed) return;
    leaving = true;
    clearTimeout(finishTimer);
    screen.dataset['state'] = 'leaving';
    exitTimer = setTimeout(remove, motion.matches ? 0 : 380);
  };
  const deadline = setTimeout(reveal, motion.matches ? 0 : 2200);
  skip.addEventListener('click', reveal, { signal: controller.signal });
  motion.addEventListener('change', () => { if (motion.matches) reveal(); }, { signal: controller.signal });
  return {
    ready,
    finish: () => {
      if (!leaving && !disposed) {
        clearTimeout(finishTimer);
        finishTimer = setTimeout(reveal, motion.matches ? 0 : Math.max(0, 1050 - (performance.now() - started)));
      }
      return ready;
    },
    destroy: remove,
  };
}
