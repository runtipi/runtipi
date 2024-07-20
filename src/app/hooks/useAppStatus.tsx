import { useContext } from 'react';
import { AppStatusStore } from '../components/ClientProviders/AppStatusProvider/app-status-store';
import { useStore } from 'zustand';
import { AppStatusStoreContext } from '../components/ClientProviders/AppStatusProvider/app-status-provider';

export const useAppStatus = <T,>(selector: (store: AppStatusStore) => T): T => {
  const appStatusStoreContext = useContext(AppStatusStoreContext);

  if (!appStatusStoreContext) {
    throw new Error(`useAppStatus must be used within a AppStatusStoreProvider`);
  }

  return useStore(appStatusStoreContext, selector);
};
