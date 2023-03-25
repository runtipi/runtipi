import { create } from 'zustand';

const SYSTEM_STATUS = {
  RUNNING: 'RUNNING',
  RESTARTING: 'RESTARTING',
  UPDATING: 'UPDATING',
  LOADING: 'LOADING',
} as const;
export type SystemStatus = (typeof SYSTEM_STATUS)[keyof typeof SYSTEM_STATUS];

type Store = {
  status: SystemStatus;
  pollStatus: boolean;
  version: { current: string; latest?: string };
  setStatus: (status: SystemStatus) => void;
  setVersion: (version: { current: string; latest?: string }) => void;
  setPollStatus: (pollStatus: boolean) => void;
};

export const useSystemStore = create<Store>((set) => ({
  status: 'RUNNING',
  version: { current: '0.0.0', latest: '0.0.0' },
  pollStatus: false,
  setStatus: (status: SystemStatus) => set((state) => ({ ...state, status })),
  setVersion: (version: { current: string; latest?: string }) => set((state) => ({ ...state, version })),
  setPollStatus: (pollStatus: boolean) => set((state) => ({ ...state, pollStatus })),
}));
