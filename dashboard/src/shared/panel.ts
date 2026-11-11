import { element } from './dom';

export interface Panel {
  root: HTMLElement;
  body: HTMLElement;
}

export function panel(title: string, subtitle: string, className = ''): Panel {
  const root = element('section', `panel ${className}`);
  const header = element('header', 'panel-header');
  header.append(element('h3', '', title), element('p', '', subtitle));
  const body = element('div', 'panel-body');
  root.append(header, body);
  return { root, body };
}

export function metric(
  label: string,
  value: string,
  unit: string,
  context: string,
  iconNode?: HTMLElement,
): HTMLElement {
  const card = element('article', 'metric');
  const header = element('div', 'metric-header');
  const title = element('h3', 'metric-label', label);
  title.title = label;
  header.append(title);
  if (iconNode) {
    header.append(iconNode);
  }
  const content = element('div', 'metric-value');
  content.append(element('strong', '', value), element('span', 'metric-unit', unit));
  const sub = element('p', 'metric-context', context);
  sub.title = context;
  card.append(header, content, sub);
  return card;
}
