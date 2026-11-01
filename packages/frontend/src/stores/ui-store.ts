import { create } from 'zustand';

export type ThemeMode = 'system' | 'light' | 'dark';

type UIStore = {
  darkMode: boolean;
  theme?: string;
  themeMode: ThemeMode;
  activeRoute?: string;
  setThemeMode: (mode: ThemeMode) => void;
  setResolvedSystemTheme: (dark: boolean) => void;
  setActiveRoute: (route: string) => void;
};

const THEME_MODE_CYCLE: Record<ThemeMode, ThemeMode> = {
  light: 'dark',
  dark: 'system',
  system: 'light',
};

export const getNextThemeMode = (mode: ThemeMode): ThemeMode => THEME_MODE_CYCLE[mode];

export const useUIStore = create<UIStore>((set) => ({
  darkMode: false,
  theme: undefined,
  themeMode: 'system',
  activeRoute: undefined,
  setActiveRoute: (activeRoute: string) => set({ activeRoute }),
  setThemeMode: (themeMode: ThemeMode) => {
    if (themeMode === 'dark') {
      set({ themeMode, theme: 'dark', darkMode: true });
    } else if (themeMode === 'light') {
      set({ themeMode, theme: 'light', darkMode: false });
    } else {
      // Resolving the system preference is the caller's (ThemeProvider's) job.
      set({ themeMode });
    }
  },
  setResolvedSystemTheme: (darkMode: boolean) => {
    set({ theme: darkMode ? 'dark' : 'light', darkMode });
  },
}));
