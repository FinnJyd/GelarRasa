const paths: Record<string, string> = {
  down: 'm6 9 6 6 6-6',
  pin: 'M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0 M15 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
  activity: 'M3 12h4l3-8 4 16 3-8h4',
  overview: 'M3 13h7V3H3z M14 21h7V11h-7z M3 21h7v-4H3z M14 7h7V3h-7z',
  shield: 'M12 3 4 6v6c0 5 8 9 8 9s8-4 8-9V6z M8 12l3 3 5-6',
  clock: 'M12 8v4l3 2 M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0',
  wind: 'M3 8h12a3 3 0 1 0-3-3 M3 12h16a3 3 0 1 1-3 3 M3 16h5a3 3 0 1 1-3 3',
  heart: 'M20 5c-3-3-6 0-8 2-2-2-5-5-8-2-5 5 8 15 8 15S25 10 20 5z',
  spark: 'm13 2-9 12h7l-1 8 10-13h-8z',
  menu: 'M4 6h16 M4 12h16 M4 18h16',
  close: 'm6 6 12 12 M6 18 18 6',
  chevron: 'm9 5 7 7-7 7',
  sun: 'M12 2v2 M12 20v2 M2 12h2 M20 12h2 M5 5l2 2 M17 17l2 2 M5 19l2-2 M17 7l2-2 M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
  info: 'M12 11v6 M12 7h.01 M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0',
};

export function icon(name: string): SVGSVGElement {
  const node = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  node.setAttribute('viewBox', '0 0 24 24');
  node.setAttribute('fill', 'none');
  node.setAttribute('stroke', 'currentColor');
  node.setAttribute('stroke-width', '1.7');
  node.setAttribute('stroke-linecap', 'round');
  node.setAttribute('stroke-linejoin', 'round');
  node.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS(node.namespaceURI, 'path');
  path.setAttribute('d', paths[name] ?? paths['info'] ?? '');
  node.append(path);
  return node;
}
