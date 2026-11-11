import { button, element } from '../shared/dom';
import { icon } from '../shared/icons';
import { initializeTheme, setThemePreference } from '../shared/theme';
import type { ThemePreference } from '../shared/theme';

export function createThemeControl(): { root: HTMLElement; destroy: () => void } {
  const controller = new AbortController();
  const root = element('div', 'theme-control');
  root.setAttribute('role', 'group');
  root.setAttribute('aria-label', 'Tema tampilan');
  const choices: { value: ThemePreference; label: string; icon: string }[] = [
    { value: 'light', label: 'Tema terang', icon: 'sun' },
    { value: 'dark', label: 'Tema gelap', icon: 'moon' },
    { value: 'system', label: 'Ikuti tema sistem', icon: 'desktop' },
  ];
  const controls = choices.map(choice => {
    const control = button('', 'theme-choice');
    control.setAttribute('aria-label', choice.label);
    control.title = choice.label;
    control.append(icon(choice.icon));
    control.addEventListener('click', () => {
      setThemePreference(choice.value);
      refresh();
    }, { signal: controller.signal });
    root.append(control);
    return { control, preference: choice.value };
  });
  function refresh(): void {
    for (const { control, preference } of controls) {
      control.setAttribute('aria-pressed', String(document.documentElement.dataset['themePreference'] === preference));
    }
  }
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (document.documentElement.dataset['themePreference'] === 'system') initializeTheme();
  }, { signal: controller.signal });
  refresh();
  return { root, destroy: () => { controller.abort(); root.remove(); } };
}
