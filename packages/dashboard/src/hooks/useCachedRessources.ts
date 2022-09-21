import { useEffect, useState } from 'react';
import { ApolloClient } from '@apollo/client';
import { createApolloClient } from '../core/apollo/client';
import { useSytemStore } from '../state/systemStore';

interface IReturnProps {
  client?: ApolloClient<unknown>;
  isLoadingComplete?: boolean;
}

// const fetcher: BareFetcher<any> = (url: string) => {
//   return axios.get(getUrl(url)).then((res) => res.data);
// };

export default function useCachedResources(): IReturnProps {
  const ip = process.env.NEXT_PUBLIC_INTERNAL_IP;
  const domain = process.env.NEXT_PUBLIC_DOMAIN;
  const port = process.env.NEXT_PUBLIC_PORT;

  // const { data } = useSWR<{ ip: string; domain: string; port: string }>('api/ip', fetcher);
  const { baseUrl, setBaseUrl, setInternalIp, setDomain } = useSytemStore();
  const [isLoadingComplete, setLoadingComplete] = useState(false);
  const [client, setClient] = useState<ApolloClient<unknown>>();

  async function loadResourcesAndDataAsync(url: string) {
    try {
      const restoredClient = await createApolloClient(url);

      setClient(restoredClient);
    } catch (error) {
      // We might want to provide this error information to an error reporting service
      console.warn(error);
    } finally {
      setLoadingComplete(true);
    }
  }

  useEffect(() => {
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
  }, [baseUrl, setBaseUrl, setInternalIp, setDomain]);

  useEffect(() => {
    if (baseUrl) {
      loadResourcesAndDataAsync(baseUrl);
    }
  }, [baseUrl]);

  return { client, isLoadingComplete };
}
