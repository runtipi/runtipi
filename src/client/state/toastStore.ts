import create from 'zustand';

export type IToast = {
  id: string;
  title: string;
  description?: string;
  status: 'error' | 'success' | 'warning' | 'info';
  position?: 'top';
  isClosable?: true;
};

type Store = {
  toasts: IToast[];
  addToast: (toast: Omit<IToast, 'id'>) => void;
  removeToast: (id: string) => void;
  clearToasts: () => void;
};

export const useToastStore = create<Store>((set) => ({
  toasts: [],
  addToast: (toast: Omit<IToast, 'id'>) => {
    const { title, description, status, position = 'top', isClosable = true } = toast;
    const id = Math.random().toString(36).substring(2, 9);

    const toastToAdd = {
      id,
      title,
      description,
      status,
      position,
      isClosable,
    };

    set((state) => ({
      toasts: [...state.toasts, { ...toastToAdd, id }],
    }));

    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      }));
    }, 5000);
  },
  removeToast: (id: string) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
  clearToasts: () => set({ toasts: [] }),
}));
