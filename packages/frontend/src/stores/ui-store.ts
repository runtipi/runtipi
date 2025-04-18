import Cookies from 'js-cookie';
import { create } from 'zustand';

type UIStore = {
  darkMode: boolean;
  theme?: string;
  activeRoute?: string;
  setDarkMode: (darkMode: boolean) => void;
  setActiveRoute: (route: string) => void;
};

export const useUIStore = create<UIStore>((set) => ({
  darkMode: false,
  theme: undefined,
  activeRoute: undefined,
  setActiveRoute: (activeRoute: string) => set({ activeRoute }),
  setDarkMode: (darkMode: boolean) => {
    if (darkMode) {
      Cookies.set('theme', 'dark', { path: '/', expires: 365 });
      document.body.dataset.bsTheme = 'dark';
      set({ theme: 'dark' });
    } else {
      Cookies.set('theme', 'light', { path: '/', expires: 365 });
      document.body.dataset.bsTheme = 'light';
      set({ theme: 'light' });
    }
  },
}));
