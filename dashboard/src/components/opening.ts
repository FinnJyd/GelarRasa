const SESSION_KEY = 'prana_session_seen';

export function createOpening(): {
  ready: Promise<void>;
  finish: () => Promise<void>;
  destroy: () => void;
} {
  const screen = document.getElementById('opening-screen');
  const app = document.getElementById('app');
  const skip = document.getElementById('skip-opening');
  if (!screen || !app || !skip) throw new Error('Opening markup is missing.');

  // Skip opening animation on page refresh (tab stays alive in same session).
  const alreadySeen = sessionStorage.getItem(SESSION_KEY) === '1';

  const controller = new AbortController();
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const started = performance.now();
  let leaving = false;
  let disposed = false;
  let loaded = false;
  let skipped = false;
  let finishTimer: ReturnType<typeof setTimeout> | undefined;
  let exitTimer: ReturnType<typeof setTimeout> | undefined;
  let resolveReady: () => void = () => undefined;
  const ready = new Promise<void>(resolve => { resolveReady = resolve; });
  app.inert = true;

  const remove = (): void => {
    if (disposed) return;
    disposed = true;
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
    // Mark session so refreshes skip the opening screen and load from cache.
    try { sessionStorage.setItem(SESSION_KEY, '1'); } catch { /* private/quota */ }
    clearTimeout(finishTimer);
    screen.dataset['state'] = 'leaving';
    exitTimer = setTimeout(remove, motion.matches ? 0 : 380);
  };
  // No timed reveal: every tab's data must be ready before the dashboard shows (finish() also runs on load errors).
  // Skip and reduced motion only drop the decorative minimum; they never reveal before the data has loaded.
  const revealIfLoaded = (): void => { if (loaded) reveal(); };
  skip.addEventListener('click', () => { skipped = true; revealIfLoaded(); }, { signal: controller.signal });
  motion.addEventListener('change', () => { if (motion.matches) revealIfLoaded(); }, { signal: controller.signal });
  return {
    ready,
    finish: () => {
      // Reveal as soon as data is ready; keep only a short minimum animation when loading was fast.
      loaded = true;
      if (!leaving && !disposed) {
        clearTimeout(finishTimer);
        const remaining = Math.max(0, 850 - (performance.now() - started));
        finishTimer = setTimeout(reveal, motion.matches || alreadySeen || skipped ? 0 : remaining);
      }
      return ready;
    },
    destroy: remove,
  };
}
