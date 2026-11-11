export type Theme = 'light' | 'dark';
export type ThemePreference = Theme | 'system';

function storedTheme(): ThemePreference {
  try {
    const value = localStorage.getItem('prana_theme');
    return value === 'light' || value === 'dark' ? value : 'system';
  } catch { return 'system'; }
}

function applyTheme(preference: ThemePreference): Theme {
  const theme = preference === 'system'
    ? matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    : preference;
  document.documentElement.dataset['themePreference'] = preference;
  document.documentElement.dataset['theme'] = theme;
  return theme;
}

export function initializeTheme(): Theme { return applyTheme(storedTheme()); }

export function setThemePreference(preference: ThemePreference): Theme {
  try { localStorage.setItem('prana_theme', preference); }
  catch { /* The selected theme still applies when storage is unavailable. */ }
  return applyTheme(preference);
}
