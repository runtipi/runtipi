import create from 'zustand';

export enum SystemStatus {
  RUNNING = 'RUNNING',
  RESTARTING = 'RESTARTING',
  UPDATING = 'UPDATING',
}

type Store = {
  baseUrl: string;
  internalIp: string;
  domain: string;
  status: SystemStatus;
  setDomain: (domain?: string) => void;
  setBaseUrl: (url: string) => void;
  setInternalIp: (ip: string) => void;
  setStatus: (status: SystemStatus) => void;
};

export const useSystemStore = create<Store>((set) => ({
  baseUrl: '',
  internalIp: '',
  domain: '',
  status: SystemStatus.RUNNING,
  setDomain: (domain?: string) => set((state) => ({ ...state, domain: domain || '' })),
  setBaseUrl: (url: string) => set((state) => ({ ...state, baseUrl: url })),
  setInternalIp: (ip: string) => set((state) => ({ ...state, internalIp: ip })),
  setStatus: (status: SystemStatus) => set((state) => ({ ...state, status })),
}));
