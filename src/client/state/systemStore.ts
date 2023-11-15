import { create } from 'zustand';

type Store = {
  pollStatus: boolean;
  version: { current: string; latest?: string };
  setVersion: (version: { current: string; latest?: string }) => void;
  setPollStatus: (pollStatus: boolean) => void;
};

export const useSystemStore = create<Store>((set) => ({
  status: 'RUNNING',
  version: { current: '0.0.0', latest: '0.0.0' },
  pollStatus: false,
  setVersion: (version: { current: string; latest?: string }) => set((state) => ({ ...state, version })),
  setPollStatus: (pollStatus: boolean) => set((state) => ({ ...state, pollStatus })),
}));
