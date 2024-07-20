'use client';

import React from 'react';
import { type ReactNode, createContext, useRef } from 'react';

import { createClientSettingsStore } from './client-settings-store';
import { settingsSchema } from '@runtipi/shared';
import { z } from 'zod';

export type ClientSettingsStoreApi = ReturnType<typeof createClientSettingsStore>;

export const ClientSettingsStoreContext = createContext<ClientSettingsStoreApi | undefined>(undefined);

export interface ClientSettingsStoreProviderProps {
  children: ReactNode;
  initialSettings: z.infer<typeof settingsSchema>;
}

export const ClientSettingsStoreProvider = ({ children, initialSettings }: ClientSettingsStoreProviderProps) => {
  const storeRef = useRef<ClientSettingsStoreApi>();
  if (!storeRef.current) {
    storeRef.current = createClientSettingsStore(initialSettings);
  }

  return <ClientSettingsStoreContext.Provider value={storeRef.current}>{children}</ClientSettingsStoreContext.Provider>;
};
