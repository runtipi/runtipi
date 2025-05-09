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
      set({ theme: 'dark' });
    } else {
      set({ theme: 'light' });
    }
    set({ darkMode });
  },
}));
