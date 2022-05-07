import create from 'zustand';

type UIStore = {
  menuItem: string;
};

export const useUIStore = create<UIStore>((set) => ({
  menuItem: 'dashboard',
  setMenuItem: (menuItem: string) => {
    set({ menuItem: menuItem });
  },
}));
