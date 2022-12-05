import { useEffect, useState } from 'react';
import { ApolloClient } from '@apollo/client';
import { createApolloClient } from '../core/apollo/client';
import { initMocks } from '../mocks';

interface IReturnProps {
  client?: ApolloClient<unknown>;
  isLoadingComplete?: boolean;
}

export default function useCachedResources(): IReturnProps {
  const [isLoadingComplete, setLoadingComplete] = useState(false);
  const [client, setClient] = useState<ApolloClient<unknown>>();

  async function loadResourcesAndDataAsync() {
    if (process.env.NEXT_PUBLIC_API_MOCKING === 'enabled') {
      await initMocks();
    }

    try {
      const restoredClient = createApolloClient();

      setClient(restoredClient);
    } catch (error) {
      // We might want to provide this error information to an error reporting service
      console.error(error);
    } finally {
      setLoadingComplete(true);
    }
  }

  useEffect(() => {
    loadResourcesAndDataAsync();
  }, []);

  return { client, isLoadingComplete };
}
