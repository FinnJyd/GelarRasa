import type { Chart, ChartType } from 'chart.js';
import type { UpdatePayload } from 'vite';

export const chartTheme = (): { text: string; grid: string; surface: string; accent: string } => {
  const styles = getComputedStyle(document.documentElement);
  return {
    text: styles.getPropertyValue('--secondary').trim(),
    grid: styles.getPropertyValue('--border').trim(),
    surface: styles.getPropertyValue('--surface').trim(),
    accent: styles.getPropertyValue('--chart-accent').trim(),
  };
};

export function manageChart<T extends ChartType>(
  chart: Chart<T, (number | null)[], string>,
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
  const refreshStyles = (update: UpdatePayload): void => {
    if (update.updates.some(item => item.type === 'css-update')) refresh();
  };
  import.meta.hot?.on('vite:afterUpdate', refreshStyles);
  applyTheme();
  return {
    refresh,
    destroy: () => {
      controller.abort();
      import.meta.hot?.off('vite:afterUpdate', refreshStyles);
      observer.disconnect();
      chart.stop();
      chart.destroy();
    },
  };
}
