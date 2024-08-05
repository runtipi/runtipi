import type { AppStatus } from '@runtipi/db';
import { createStore } from 'zustand/vanilla';

export type AppStatusState = {
  statuses: Record<string, AppStatus>;
};

export type AppStatusActions = {
  setAppStatus: (appId: string, status: AppStatus) => void;
};

export type AppStatusStore = AppStatusState & AppStatusActions;

export const defaultInitState: AppStatusState = {
  statuses: {},
};

export const createAppStatusStore = (initState: AppStatusState = defaultInitState) => {
  return createStore<AppStatusStore>()((set) => ({
    ...initState,
    setAppStatus: (appId: string, status: AppStatus) => {
      set((state) => ({
        statuses: {
          ...state.statuses,
          [appId]: status,
        },
      }));
    },
  }));
};
