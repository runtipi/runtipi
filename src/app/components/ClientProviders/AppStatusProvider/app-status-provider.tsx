'use client';

import React from 'react';
import { type ReactNode, createContext, useRef } from 'react';

import type { AppStatus } from '@runtipi/db';
import { createAppStatusStore } from './app-status-store';

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
