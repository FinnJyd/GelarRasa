import type { Chart, ChartType } from 'chart.js';
import type { UpdatePayload } from 'vite';

interface ResizeControl { pause: () => void; resume: () => void }
const liveControls = new Set<ResizeControl>();

// Layout-follow animations change container widths every frame; Chart.js would redraw each canvas
// per frame (the jank). Pause resizes for the animation's duration, then resize once at the end.
export function pauseChartResize(): void {
  for (const control of liveControls) control.pause();
}

export function resumeChartResize(): void {
  for (const control of liveControls) control.resume();
}

export const chartTheme = (): { text: string; grid: string; surface: string; accent: string } => {
  const styles = getComputedStyle(document.documentElement);
  return {
    text: styles.getPropertyValue('--secondary').trim(),
    grid: styles.getPropertyValue('--border').trim(),
    surface: styles.getPropertyValue('--surface').trim(),
    accent: styles.getPropertyValue('--chart-accent').trim(),
  };
};

export function manageChart<T extends ChartType, D = (number | null)[]>(
  chart: Chart<T, D, string>,
  applyTheme: () => void,
): { refresh: () => void; destroy: () => void } {
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const controller = new AbortController();
  const refresh = (): void => {
    chart.stop();
    if (chart.options) {
      chart.canvas.dataset['animation'] = motion.matches ? 'complete' : 'running';
      chart.options.animation = motion.matches ? false : {
        duration: 650, easing: 'easeOutQuart',
        onComplete: () => { chart.canvas.dataset['animation'] = 'complete'; },
      };
    }
    applyTheme();
    chart.update(motion.matches ? 'none' : undefined);
  };
  const observer = new MutationObserver(refresh);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  motion.addEventListener('change', refresh, { signal: controller.signal });
  let restore: (() => void) | null = null;
  const control: ResizeControl = {
    pause: () => {
      if (restore) return;
      const original = chart.resize;
      const responsive = chart.options?.responsive;
      chart.resize = () => undefined;
      if (chart.options) chart.options.responsive = false;
      restore = () => {
        chart.resize = original;
        if (chart.options && responsive !== undefined) chart.options.responsive = responsive;
      };
    },
    resume: () => {
      if (!restore) return;
      restore();
      restore = null;
      chart.resize();
    },
  };
  liveControls.add(control);
  const refreshStyles = (update: UpdatePayload): void => {
    if (update.updates.some(item => item.type === 'css-update')) refresh();
  };
  import.meta.hot?.on('vite:afterUpdate', refreshStyles);
  applyTheme();
  return {
    refresh,
    destroy: () => {
      if (restore) { restore(); restore = null; }
      liveControls.delete(control);
      controller.abort();
      import.meta.hot?.off('vite:afterUpdate', refreshStyles);
      observer.disconnect();
      chart.stop();
      chart.destroy();
    },
  };
}
