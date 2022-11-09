import create from 'zustand';

export enum SystemStatus {
  RUNNING = 'RUNNING',
  RESTARTING = 'RESTARTING',
  UPDATING = 'UPDATING',
}

type Store = {
  status: SystemStatus;
  setStatus: (status: SystemStatus) => void;
};

export const useSystemStore = create<Store>((set) => ({
  status: SystemStatus.RUNNING,
  setStatus: (status: SystemStatus) => set((state) => ({ ...state, status })),
}));
