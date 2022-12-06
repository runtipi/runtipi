import create from 'zustand';

type UIStore = {
  menuItem: string;
  darkMode: boolean;
  setMenuItem: (menuItem: string) => void;
  setDarkMode: (darkMode: boolean) => void;
};

export const useUIStore = create<UIStore>((set) => ({
  menuItem: 'dashboard',
  darkMode: false,
  setDarkMode: (darkMode: boolean) => {
    if (darkMode) {
      localStorage.setItem('darkMode', darkMode.toString());
      document.body.classList.add('theme-dark');
    }
    if (!darkMode) {
      localStorage.setItem('darkMode', darkMode.toString());
      document.body.classList.remove('theme-dark');
    }
    set({ darkMode });
  },
  setMenuItem: (menuItem: string) => {
    set({ menuItem });
  },
}));
