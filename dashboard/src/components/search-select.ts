import { button, element } from '../shared/dom';
import { icon } from '../shared/icons';

export type SelectOption = readonly [value: string, label: string];

export function searchableSelect(id: string, label: string, onChange: (value: string) => void): {
  field: HTMLElement;
  setOptions: (options: readonly SelectOption[], value: string) => void;
  close: () => void;
  destroy: () => void;
} {
  const controller = new AbortController();
  const listen = { signal: controller.signal };
  const field = element('div', 'filter-field');
  const caption = element('label', '', label);
  caption.htmlFor = id;
  const control = element('div', 'search-select');
  const input = element('input', 'combobox-input');
  input.id = id;
  input.type = 'text';
  input.autocomplete = 'off';
  input.spellcheck = false;
  input.placeholder = `Cari ${label.toLocaleLowerCase('id-ID')}…`;
  input.setAttribute('role', 'combobox');
  input.setAttribute('aria-autocomplete', 'list');
  input.setAttribute('aria-expanded', 'false');
  input.setAttribute('aria-controls', `${id}-options`);
  const toggle = button('', 'combobox-toggle');
  toggle.tabIndex = -1;
  toggle.setAttribute('aria-label', `Buka pilihan ${label.toLocaleLowerCase('id-ID')}`);
  toggle.append(icon('down'));
  control.append(input, toggle);
  field.append(caption, control);
  const popup = element('div', 'search-popup');
  popup.hidden = true;
  const list = element('div', 'search-options');
  list.id = `${id}-options`;
  list.setAttribute('role', 'listbox');
  list.setAttribute('aria-label', `Pilihan ${label.toLocaleLowerCase('id-ID')}`);
  const empty = element('p', 'search-empty', `Tidak ada ${label.toLocaleLowerCase('id-ID')} yang cocok.`);
  empty.setAttribute('role', 'status');
  const hint = element('p', 'search-hint', 'Ketik untuk mencari · ↑ ↓ · Enter · Esc');
  popup.append(list, empty, hint);
  document.body.append(popup);
  let choices: readonly SelectOption[] = [];
  let matches: readonly SelectOption[] = [];
  let value = '';
  let query = '';
  let active = 0;
  let opened = false;

  const normalize = (text: string): string => text.normalize('NFKD').replace(/\p{M}/gu, '').toLocaleLowerCase('id-ID');
  const selectedLabel = (): string => choices.find(option => option[0] === value)?.[1] ?? '';

  function close(): void {
    opened = false;
    popup.hidden = true;
    input.setAttribute('aria-expanded', 'false');
    input.removeAttribute('aria-activedescendant');
    control.classList.remove('is-open');
    input.value = selectedLabel();
    query = '';
  }

  function place(): void {
    if (!opened) return;
    const bounds = control.getBoundingClientRect();
    const viewport = window.visualViewport;
    const viewportTop = viewport?.offsetTop ?? 0;
    const viewportHeight = viewport?.height ?? innerHeight;
    const viewportWidth = viewport?.width ?? innerWidth;
    if (!bounds.width || bounds.bottom < viewportTop || bounds.top > viewportTop + viewportHeight) { close(); return; }
    const below = viewportTop + viewportHeight - bounds.bottom - 12;
    const above = bounds.top - viewportTop - 12;
    const useAbove = below < 180 && above > below;
    popup.style.width = `${Math.min(bounds.width, viewportWidth - 24)}px`;
    popup.style.left = `${Math.max(12, Math.min(bounds.left, viewportWidth - bounds.width - 12))}px`;
    const available = Math.max(80, Math.min(300, useAbove ? above : below));
    popup.style.maxHeight = `${available}px`;
    popup.style.top = useAbove ? 'auto' : `${bounds.bottom + 6}px`;
    popup.style.bottom = useAbove ? `${innerHeight - bounds.top + 6}px` : 'auto';
  }

  function render(): void {
    matches = choices.filter(option => normalize(option[1]).includes(normalize(query.trim())));
    active = Math.max(0, Math.min(active, matches.length - 1));
    list.replaceChildren(...matches.map(([optionValue, text], index) => {
      const option = element('div', `search-option${index === active ? ' is-active' : ''}`, text);
      option.id = `${id}-option-${index}`;
      option.dataset['value'] = optionValue;
      option.setAttribute('role', 'option');
      option.setAttribute('aria-selected', String(index === active));
      return option;
    }));
    empty.hidden = matches.length !== 0;
    if (matches.length) input.setAttribute('aria-activedescendant', `${id}-option-${active}`);
    else input.removeAttribute('aria-activedescendant');
    place();
  }

  function open(): void {
    if (opened) return;
    opened = true;
    query = '';
    active = Math.max(0, choices.findIndex(option => option[0] === value));
    popup.hidden = false;
    control.classList.add('is-open');
    input.setAttribute('aria-expanded', 'true');
    render();
  }

  function choose(next: string): void {
    if (!choices.some(option => option[0] === next)) return;
    const changed = value !== next;
    value = next;
    close();
    input.select();
    if (changed) onChange(value);
  }

  input.addEventListener('focus', () => { open(); input.select(); }, listen);
  input.addEventListener('click', () => { if (!opened) { open(); input.select(); } }, listen);
  input.addEventListener('input', () => { query = input.value; active = 0; opened = true; control.classList.add('is-open'); popup.hidden = false; input.setAttribute('aria-expanded', 'true'); render(); }, listen);
  input.addEventListener('blur', close, listen);
  input.addEventListener('keydown', event => {
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(); return; }
    if (event.key === 'Tab') { close(); return; }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!opened) { open(); return; }
      active = Math.max(0, Math.min(matches.length - 1, active + (event.key === 'ArrowDown' ? 1 : -1)));
      render();
      list.children[active]?.scrollIntoView({ block: 'nearest' });
    } else if (event.key === 'Enter' && opened) {
      event.preventDefault();
      const option = matches[active];
      if (option) choose(option[0]);
    }
  }, listen);
  toggle.addEventListener('pointerdown', event => event.preventDefault(), listen);
  toggle.addEventListener('click', () => { if (opened) close(); else { input.focus(); open(); input.select(); } }, listen);
  popup.addEventListener('pointerdown', event => event.preventDefault(), listen);
  list.addEventListener('click', event => {
    if (!(event.target instanceof Element)) return;
    const option = event.target.closest<HTMLElement>('[role="option"]');
    if (option?.dataset['value']) choose(option.dataset['value']);
  }, listen);
  document.addEventListener('pointerdown', event => {
    if (event.target instanceof Node && !control.contains(event.target) && !popup.contains(event.target)) close();
  }, listen);
  window.addEventListener('resize', place, listen);
  window.addEventListener('scroll', place, { ...listen, capture: true });
  window.visualViewport?.addEventListener('resize', place, listen);
  const observer = new ResizeObserver(place);
  observer.observe(control);
  return {
    field,
    setOptions: (options, selected) => {
      choices = options;
      if (!choices.some(option => option[0] === selected)) throw new Error(`Invalid selection for ${id}.`);
      value = selected;
      if (opened) render();
      else input.value = selectedLabel();
    },
    close,
    destroy: () => { controller.abort(); observer.disconnect(); popup.remove(); },
  };
}
