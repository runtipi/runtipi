import create from 'zustand';

type Store = {
  internalIp: string;
  setInternalIp: (internalIp: string) => void;
};

export const useSytemStore = create<Store>((set) => ({
  internalIp: '',
  setInternalIp: (internalIp: string) => set((state) => ({ ...state, internalIp })),
}));
