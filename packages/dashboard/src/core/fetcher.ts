import { BareFetcher } from 'swr';
import axios from 'axios';
import { useSytemStore } from '../state/systemStore';

const fetcher: BareFetcher<any> = (url: string) => {
  const { getState } = useSytemStore;
  const BASE_URL = `http://${getState().internalIp}:3001`;

  return axios.get(url, { baseURL: BASE_URL, withCredentials: true }).then((res) => res.data);
};

export default fetcher;
