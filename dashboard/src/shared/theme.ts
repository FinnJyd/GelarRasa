export type Theme = 'light' | 'dark';

function storedTheme(): string | null {
  try { return localStorage.getItem('prana_theme'); }
  catch { return null; }
}

export function initializeTheme(): Theme {
  const stored = storedTheme();
  const theme = stored === 'dark' || (stored !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
  document.documentElement.dataset['theme'] = theme;
  return theme;
}

export function toggleTheme(): Theme {
  const theme = document.documentElement.dataset['theme'] === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset['theme'] = theme;
  try { localStorage.setItem('prana_theme', theme); }
  catch { /* The selected theme still applies when storage is unavailable. */ }
  return theme;
}
