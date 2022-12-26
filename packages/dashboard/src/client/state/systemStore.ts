import create from 'zustand';

export enum SystemStatus {
  RUNNING = 'RUNNING',
  RESTARTING = 'RESTARTING',
  UPDATING = 'UPDATING',
  LOADING = 'LOADING',
}

type Store = {
  status: SystemStatus;
  version: { current: string; latest?: string };
  setStatus: (status: SystemStatus) => void;
  setVersion: (version: { current: string; latest?: string }) => void;
};

export const useSystemStore = create<Store>((set) => ({
  status: SystemStatus.RUNNING,
  version: { current: '0.0.0', latest: '0.0.0' },
  setStatus: (status: SystemStatus) => set((state) => ({ ...state, status })),
  setVersion: (version: { current: string; latest?: string }) => set((state) => ({ ...state, version })),
}));
