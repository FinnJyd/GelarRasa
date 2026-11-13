import { analysisDetails, choiceButton, setSelected } from './analysis-controls';
import { element } from './dom';

export interface SeriesLegendEntry { label: string; color: string; visible: boolean }

export function seriesLegend(host: HTMLElement, toggle: (index: number) => boolean): {
  update: (entries: readonly SeriesLegendEntry[]) => void; destroy: () => void;
} {
  const controller = new AbortController();
  const list = element('div', 'analysis-legend analysis-chart-legend');
  const disclosure = analysisDetails(list, 'Legenda seri');
  host.append(disclosure);
  list.addEventListener('click', event => {
    const target = event.target instanceof Element ? event.target.closest('button[data-series]') : null;
    if (!(target instanceof HTMLButtonElement)) return;
    setSelected(target, toggle(Number(target.dataset['series'])));
  }, { signal: controller.signal });
  return {
    update(entries): void {
      list.replaceChildren(...entries.map((entry, index) => {
        const button = choiceButton(entry.label, entry.visible);
        button.dataset['series'] = String(index);
        const swatch = element('i', 'swatch');
        swatch.style.backgroundColor = entry.color;
        swatch.setAttribute('aria-hidden', 'true');
        button.prepend(swatch);
        return button;
      }));
    },
    destroy(): void { controller.abort(); disclosure.remove(); },
  };
}
