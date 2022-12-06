import create from 'zustand';

export type IToast = {
  id: string;
  title: string;
  description?: string;
  status: 'error' | 'success' | 'warning' | 'info';
  position: 'top';
  isClosable: true;
};

type Store = {
  toasts: IToast[];
  addToast: (toast: Omit<IToast, 'id'>) => void;
  removeToast: (id: string) => void;
};

export const useToastStore = create<Store>((set) => ({
  toasts: [],
  addToast: (toast: Omit<IToast, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9);

    set((state) => ({
      toasts: [...state.toasts, { ...toast, id }],
    }));

    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      }));
    }, 5000);
  },
  removeToast: (id: string) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));
