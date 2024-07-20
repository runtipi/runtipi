import { useContext } from 'react';
import { ClientSettingsStoreContext } from '../components/ClientProviders/ClientSettingsProvider/ClientSettingsProvider';
import { useStore } from 'zustand';

export const useClientSettings = () => {
  const clientSettingsStoreContext = useContext(ClientSettingsStoreContext);

  if (!clientSettingsStoreContext) {
    throw new Error(`useClientSettings must be used within a ClientSettingsStoreProvider`);
  }

  return useStore(clientSettingsStoreContext);
};
