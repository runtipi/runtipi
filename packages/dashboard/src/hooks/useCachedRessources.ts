import { useEffect, useState } from 'react';
import { ApolloClient } from '@apollo/client';
import axios from 'axios';
import useSWR, { BareFetcher } from 'swr';
import { createApolloClient } from '../core/apollo/client';
import { useSytemStore } from '../state/systemStore';
import { getUrl } from '../core/helpers/url-helpers';

interface IReturnProps {
  client?: ApolloClient<unknown>;
  isLoadingComplete?: boolean;
}

const fetcher: BareFetcher<any> = (url: string) => {
  return axios.get(getUrl(url)).then((res) => res.data);
};

export default function useCachedResources(): IReturnProps {
  const { data } = useSWR('api/ip', fetcher);
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
    const { ip, domain } = data || {};
    if (ip && !baseUrl) {
      setInternalIp(ip);
      setDomain(domain);

      if (!domain || domain === 'tipi.localhost') {
        setBaseUrl(`http://${ip}/api`);
      } else {
        setBaseUrl(`https://${domain}/api`);
      }
    }
  }, [baseUrl, data.ip, data.domain, setBaseUrl, data, setInternalIp, setDomain]);

  useEffect(() => {
    if (baseUrl) {
      loadResourcesAndDataAsync(baseUrl);
    }
  }, [baseUrl]);

  return { client, isLoadingComplete };
}
