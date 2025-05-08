import { create } from 'zustand';

type UIStore = {
  darkMode: boolean;
  theme?: string;
  themeBase?: string;
  primaryColor?: string;
  activeRoute?: string;
  setDarkMode: (darkMode: boolean) => void;
  setActiveRoute: (route: string) => void;
  setThemeBase: (theme: string) => void;
  setPrimaryColor: (primaryColor: string) => void;
};

export const useUIStore = create<UIStore>((set) => ({
  darkMode: false,
  theme: undefined,
  activeRoute: undefined,
  themeBase: undefined,
  setActiveRoute: (activeRoute: string) => set({ activeRoute }),
  setDarkMode: (darkMode: boolean) => {
    if (darkMode) {
      set({ theme: 'dark' });
    } else {
      set({ theme: 'light' });
    }
    set({ darkMode });
  },
  setThemeBase: (themeBase: string) => set({ themeBase }),
  setPrimaryColor: (primaryColor: string) => set({ primaryColor }),
}));
