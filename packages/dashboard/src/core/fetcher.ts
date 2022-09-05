import { BareFetcher } from 'swr';
import axios from 'axios';
import { useSytemStore } from '../state/systemStore';

const fetcher: BareFetcher<any> = (url: string) => {
  const { baseUrl } = useSytemStore.getState();

  return axios.get(url, { baseURL: baseUrl, withCredentials: true }).then((res) => res.data);
};

export default fetcher;
