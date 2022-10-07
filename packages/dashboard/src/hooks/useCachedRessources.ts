import { useEffect, useState } from 'react';
import { ApolloClient } from '@apollo/client';
import { createApolloClient } from '../core/apollo/client';
import { useSystemStore } from '../state/systemStore';
import useSWR, { Fetcher } from 'swr';
import { getUrl } from '../core/helpers/url-helpers';

interface IReturnProps {
  client?: ApolloClient<unknown>;
  isLoadingComplete?: boolean;
}

const fetcher: Fetcher<{ ip: string; domain: string; port: string }, string> = (...args) => fetch(...args).then((res) => res.json());

export default function useCachedResources(): IReturnProps {
  const { data } = useSWR(getUrl('api/getenv'), fetcher);
  const { baseUrl, setBaseUrl, setInternalIp, setDomain } = useSystemStore();
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
    const { ip, domain, port } = data || {};

    if (ip && !baseUrl) {
      setInternalIp(ip);
      setDomain(domain);

      if (!domain || domain === 'tipi.localhost') {
        if (port === '80') {
          setBaseUrl(`http://${ip}/api`);
        } else {
          setBaseUrl(`http://${ip}:${port}/api`);
        }
      } else {
        setBaseUrl(`https://${domain}/api`);
      }
    }
  }, [baseUrl, setBaseUrl, setInternalIp, setDomain, data]);

  useEffect(() => {
    if (baseUrl) {
      console.log('loadResourcesAndDataAsync', baseUrl);
      loadResourcesAndDataAsync(baseUrl);
    }
  }, [baseUrl]);

  return { client, isLoadingComplete };
}
