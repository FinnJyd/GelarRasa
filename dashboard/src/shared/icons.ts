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
  moon: 'M20.5 13A8.5 8.5 0 0 1 11 3.5 8.5 8.5 0 1 0 20.5 13z',
  desktop: 'M3 4h18v13H3z M12 17v4 M8 21h8',
  info: 'M12 11v6 M12 7h.01 M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0',
  chat: 'M21 11.5a8.5 8.5 0 0 1-8.5 8.5 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7A8.5 8.5 0 1 1 21 11.5z',
  pen: 'M12 20h9 M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z',
  check: 'm5 13 4 4L19 7',
  plus: 'M12 5v14 M5 12h14',
  trash: 'M4 7h16 M9 7V5.5A1.5 1.5 0 0 0 7.5 4h-1A1.5 1.5 0 0 0 5 5.5V7 M6.5 7l1 12.5A1.5 1.5 0 0 0 9 21h6a1.5 1.5 0 0 0 1.5-1.5L17.5 7',
  resume: 'm8 5 11 7-11 7z',
  expand: 'M21 3l-7 7 M21 3h-6 M21 3v6 M3 21l7-7 M3 21h6 M3 21v-6',
  compress: 'M4 14h6v6 M20 10h-6V4 M14 10l6-6 M4 20l6-6',
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
