import { create } from 'zustand';

export type ColorMode = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

type UIStore = {
  /** What the user picked, "system" follows the device */
  colorMode: ColorMode;
  /** The theme in use once "system" is resolved */
  theme?: ResolvedTheme;
  darkMode: boolean;
  activeRoute?: string;
  commandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;
  setColorMode: (mode: ColorMode) => void;
  setResolvedTheme: (theme: ResolvedTheme) => void;
  setDarkMode: (darkMode: boolean) => void;
  setActiveRoute: (route: string) => void;
};

export const useUIStore = create<UIStore>((set) => ({
  colorMode: 'system',
  theme: undefined,
  darkMode: false,
  activeRoute: undefined,
  commandPaletteOpen: false,
  setCommandPaletteOpen: (commandPaletteOpen: boolean) => set({ commandPaletteOpen }),
  setActiveRoute: (activeRoute: string) => set({ activeRoute }),
  setColorMode: (colorMode: ColorMode) => set({ colorMode }),
  setResolvedTheme: (theme: ResolvedTheme) => set({ theme, darkMode: theme === 'dark' }),
  // Picking light or dark explicitly
  setDarkMode: (darkMode: boolean) => set({ colorMode: darkMode ? 'dark' : 'light' }),
}));
