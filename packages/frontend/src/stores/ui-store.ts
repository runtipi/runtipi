import { create } from 'zustand';

type UIStore = {
  darkMode: boolean;
  theme?: string;
  activeRoute?: string;
  commandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;
  setDarkMode: (darkMode: boolean) => void;
  setActiveRoute: (route: string) => void;
};

export const useUIStore = create<UIStore>((set) => ({
  darkMode: false,
  theme: undefined,
  activeRoute: undefined,
  commandPaletteOpen: false,
  setCommandPaletteOpen: (commandPaletteOpen: boolean) => set({ commandPaletteOpen }),
  setActiveRoute: (activeRoute: string) => set({ activeRoute }),
  setDarkMode: (darkMode: boolean) => {
    if (darkMode) {
      set({ theme: 'dark' });
    } else {
      set({ theme: 'light' });
    }
    set({ darkMode });
  },
}));
