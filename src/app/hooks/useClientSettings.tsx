import { useContext } from 'react';
import { useStore } from 'zustand';
import { ClientSettingsStoreContext } from '../components/ClientProviders/ClientSettingsProvider/ClientSettingsProvider';

export const useClientSettings = () => {
  const clientSettingsStoreContext = useContext(ClientSettingsStoreContext);

  if (!clientSettingsStoreContext) {
    throw new Error(`useClientSettings must be used within a ClientSettingsStoreProvider`);
  }

  return useStore(clientSettingsStoreContext);
};
