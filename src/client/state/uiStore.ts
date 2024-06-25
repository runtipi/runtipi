import { createTranslator } from 'next-intl';
import { create } from 'zustand';
import englishMessages from '../messages/en.json';

const defaultTranslator = createTranslator({ locale: 'en', messages: englishMessages });

type UIStore = {
  darkMode: boolean;
  theme?: string;
  translator: typeof defaultTranslator;
  setDarkMode: (darkMode: boolean) => void;
  setTranslator: (translator: typeof defaultTranslator) => void;
};

export const useUIStore = create<UIStore>((set) => ({
  darkMode: false,
  translator: defaultTranslator,
  theme: undefined,
  setTranslator: (translator: typeof defaultTranslator) => {
    set({ translator });
  },
  setDarkMode: (darkMode: boolean) => {
    if (darkMode) {
      set({ theme: 'dark' });
    } else {
      set({ theme: 'light' });
    }
    set({ darkMode });
  },
}));
