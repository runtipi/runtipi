import { useEffect, useState, useCallback } from 'react';
import { ApolloClient } from '@apollo/client';
import { createApolloClient } from '../core/apollo/client';

interface IReturnProps {
  client?: ApolloClient<unknown>;
  isLoadingComplete?: boolean;
}

export default function useCachedResources(): IReturnProps {
  const [isLoadingComplete, setLoadingComplete] = useState(false);
  const [client, setClient] = useState<ApolloClient<unknown>>();

  const loadResourcesAndDataAsync = useCallback(() => {
    try {
      const restoredClient = createApolloClient();

      setClient(restoredClient);
    } catch (error) {
      // We might want to provide this error information to an error reporting service
      console.error(error);
    }
  }, []);

  useEffect(() => {
    loadResourcesAndDataAsync();
  }, [loadResourcesAndDataAsync]);

  useEffect(() => {
    if (client) {
      setLoadingComplete(true);
    }
  }, [client]);

  return { client, isLoadingComplete };
}
