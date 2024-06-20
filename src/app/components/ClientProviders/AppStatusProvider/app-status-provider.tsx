'use client';

import React from 'react';
import { type ReactNode, createContext, useRef, useContext } from 'react';
import { useStore } from 'zustand';

import { type AppStatusStore, createAppStatusStore } from './app-status-store';
import type { AppStatus } from '@/server/db/schema';

export type AppStatusStoreApi = ReturnType<typeof createAppStatusStore>;

export const AppStatusStoreContext = createContext<AppStatusStoreApi | undefined>(undefined);

export interface AppStatusStoreProviderProps {
  children: ReactNode;
  initialStatuses: Record<string, AppStatus>;
}

export const AppStatusStoreProvider = ({ children, initialStatuses }: AppStatusStoreProviderProps) => {
  const storeRef = useRef<AppStatusStoreApi>();
  if (!storeRef.current) {
    storeRef.current = createAppStatusStore({ statuses: initialStatuses });
  }

  return <AppStatusStoreContext.Provider value={storeRef.current}>{children}</AppStatusStoreContext.Provider>;
};

export const useAppStatusStore = <T,>(selector: (store: AppStatusStore) => T): T => {
  const appStatusStoreContext = useContext(AppStatusStoreContext);

  if (!appStatusStoreContext) {
    throw new Error(`useAppStatusStore must be used within a AppStatusStoreProvider`);
  }

  return useStore(appStatusStoreContext, selector);
};
