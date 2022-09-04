import create from 'zustand';

type Store = {
  baseUrl: string;
  internalIp: string;
  domain: string;
  setDomain: (domain?: string) => void;
  setBaseUrl: (url: string) => void;
  setInternalIp: (ip: string) => void;
};

export const useSytemStore = create<Store>((set) => ({
  baseUrl: '',
  internalIp: '',
  domain: '',
  setDomain: (domain?: string) => set((state) => ({ ...state, domain: domain || '' })),
  setBaseUrl: (url: string) => set((state) => ({ ...state, baseUrl: url })),
  setInternalIp: (ip: string) => set((state) => ({ ...state, internalIp: ip })),
}));
