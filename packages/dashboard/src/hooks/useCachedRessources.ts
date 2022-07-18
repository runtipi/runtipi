import { useEffect, useState } from 'react';
import { ApolloClient } from '@apollo/client';
import axios from 'axios';
import useSWR, { BareFetcher } from 'swr';
import { createApolloClient } from '../core/apollo/client';
import { useSytemStore } from '../state/systemStore';

interface IReturnProps {
  client?: ApolloClient<unknown>;
  isLoadingComplete?: boolean;
}

const fetcher: BareFetcher<any> = (url: string) => {
  return axios.get(url).then((res) => res.data);
};

export default function useCachedResources(): IReturnProps {
  const { data } = useSWR('/api/ip', fetcher);
  const { internalIp, setInternalIp } = useSytemStore();
  const [isLoadingComplete, setLoadingComplete] = useState(false);
  const [client, setClient] = useState<ApolloClient<unknown>>();

  async function loadResourcesAndDataAsync(ip: string) {
    try {
      const restoredClient = await createApolloClient(ip);

      setClient(restoredClient);
    } catch (error) {
      // We might want to provide this error information to an error reporting service
      console.warn(error);
    } finally {
      setLoadingComplete(true);
    }
  }

  useEffect(() => {
    if (data?.ip && !internalIp) {
      setInternalIp(data.ip);
    }
  }, [data?.ip, internalIp, setInternalIp]);

  useEffect(() => {
    if (internalIp) {
      loadResourcesAndDataAsync(internalIp);
    }
  }, [internalIp]);

  return { client, isLoadingComplete };
}
