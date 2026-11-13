import { button, element } from './dom';

export function setSelected(control: HTMLButtonElement, selected: boolean): void {
  control.setAttribute('aria-pressed', String(selected));
}

export function choiceButton(label: string, selected = false): HTMLButtonElement {
  const control = button(label, 'button');
  setSelected(control, selected);
  return control;
}

export function choiceGroup(label: string, controls: readonly HTMLButtonElement[]): HTMLElement {
  const group = element('div', 'segmented-control analysis-modes');
  group.setAttribute('role', 'group'); group.setAttribute('aria-label', label);
  group.style.setProperty('--analysis-choices', String(controls.length));
  group.append(...controls);
  return group;
}

export function analysisDetails(content: HTMLElement, label = 'Cara membaca'): HTMLDetailsElement {
  const details = element('details', 'data-disclosure analysis-details');
  details.append(element('summary', '', label), content);
  return details;
}
