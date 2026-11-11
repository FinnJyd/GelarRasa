export function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className = '',
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export function button(label: string, className = 'button'): HTMLButtonElement {
  const node = element('button', className, label);
  node.type = 'button';
  return node;
}

export function image(src: string, alt: string, className: string): HTMLImageElement {
  const node = element('img', className);
  node.src = src;
  node.alt = alt;
  return node;
}

export function emptyState(title: string, description: string): HTMLElement {
  const node = element('div', 'empty-state');
  node.append(element('h3', '', title), element('p', '', description));
  return node;
}
