import create from 'zustand';

export enum SystemStatus {
  RUNNING = 'RUNNING',
  RESTARTING = 'RESTARTING',
  UPDATING = 'UPDATING',
}

type Store = {
  baseUrl: string;
  status: SystemStatus;
  setBaseUrl: (url: string) => void;
  setStatus: (status: SystemStatus) => void;
};

export const useSystemStore = create<Store>((set) => ({
  baseUrl: '',
  status: SystemStatus.RUNNING,
  setBaseUrl: (url: string) => set((state) => ({ ...state, baseUrl: url })),
  setStatus: (status: SystemStatus) => set((state) => ({ ...state, status })),
}));
