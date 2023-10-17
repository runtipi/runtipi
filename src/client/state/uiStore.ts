import { createTranslator } from 'next-intl';
import { create } from 'zustand';
import englishMessages from '../messages/en.json';

const defaultTranslator = createTranslator({ locale: 'en', messages: englishMessages });

type UIStore = {
  menuItem: string;
  darkMode: boolean;
  theme?: string;
  translator: typeof defaultTranslator;
  setMenuItem: (menuItem: string) => void;
  setDarkMode: (darkMode: boolean) => void;
  setTranslator: (translator: typeof defaultTranslator) => void;
};

export const useUIStore = create<UIStore>((set) => ({
  menuItem: 'dashboard',
  darkMode: false,
  translator: defaultTranslator,
  theme: undefined,
  setTranslator: (translator: typeof defaultTranslator) => {
    set({ translator });
  },
  setDarkMode: (darkMode: boolean) => {
    if (darkMode) {
      set({ theme: 'dark' });
    }
    if (!darkMode) {
      set({ theme: 'light' });
    }
    set({ darkMode });
  },
  setMenuItem: (menuItem: string) => {
    set({ menuItem });
  },
}));
