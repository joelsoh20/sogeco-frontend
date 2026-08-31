import { create } from 'zustand';

export type Theme = 'light' | 'dark';

interface ThemeState {
  theme: Theme;
  toggle: () => void;
  setTheme: (theme: Theme) => void;
}

const STORAGE_KEY = 'sogeco-theme';

/**
 * Preference de theme, memorisee dans le navigateur.
 *
 * La classe "dark" est posee sur <html> — c'est ce que la strategie
 * darkMode: 'class' de Tailwind attend pour activer les variantes
 * dark: partout dans l'application, sans qu'aucun composant n'ait a
 * verifier lui-meme la preference.
 *
 * Le theme par defaut reste clair : c'est l'identite que SOGECO a
 * validee sur les maquettes. Le sombre est une option, jamais le
 * point de depart.
 */
function readInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'light';
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === 'light' || stored === 'dark') return stored;
  return 'light';
}

function applyThemeClass(theme: Theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark');
}

const initial = readInitialTheme();
if (typeof document !== 'undefined') {
  applyThemeClass(initial);
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: initial,

  toggle: () => {
    const next: Theme = get().theme === 'light' ? 'dark' : 'light';
    applyThemeClass(next);
    window.localStorage.setItem(STORAGE_KEY, next);
    set({ theme: next });
  },

  setTheme: (theme) => {
    applyThemeClass(theme);
    window.localStorage.setItem(STORAGE_KEY, theme);
    set({ theme });
  },
}));
