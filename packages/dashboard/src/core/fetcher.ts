import { BareFetcher } from 'swr';
import axios from 'axios';
import { useSystemStore } from '../state/systemStore';

const fetcher: BareFetcher<any> = (url: string) => {
  const { baseUrl } = useSystemStore.getState();

  return axios.get(url, { baseURL: baseUrl, withCredentials: true }).then((res) => res.data);
};

export default fetcher;
