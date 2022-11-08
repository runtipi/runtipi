import { useEffect, useState } from 'react';
import { ApolloClient } from '@apollo/client';
import { createApolloClient } from '../core/apollo/client';
import { useSystemStore } from '../state/systemStore';

interface IReturnProps {
  client?: ApolloClient<unknown>;
  isLoadingComplete?: boolean;
}

export default function useCachedResources(): IReturnProps {
  const { baseUrl, setBaseUrl } = useSystemStore();
  const [isLoadingComplete, setLoadingComplete] = useState(false);
  const [client, setClient] = useState<ApolloClient<unknown>>();

  async function loadResourcesAndDataAsync(url: string) {
    try {
      const restoredClient = await createApolloClient(url);

      setClient(restoredClient);
    } catch (error) {
      // We might want to provide this error information to an error reporting service
      console.error(error);
    } finally {
      setLoadingComplete(true);
    }
  }

  useEffect(() => {
    const hostname = window.location.hostname;
    const port = window.location.port;

    if (!port) {
      setBaseUrl(`http://${hostname}/api`);
    } else {
      setBaseUrl(`http://${hostname}:${port}/api`);
    }
  }, [setBaseUrl]);

  useEffect(() => {
    if (baseUrl) {
      loadResourcesAndDataAsync(baseUrl);
    }
  }, [baseUrl]);

  return { client, isLoadingComplete };
}
