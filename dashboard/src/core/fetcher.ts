import { BareFetcher } from 'swr';
import axios from 'axios';
import { BASE_URL } from './api';

const fetcher: BareFetcher<any> = (url: string) => {
  return axios.get(url, { baseURL: BASE_URL }).then((res) => res.data);
};

export default fetcher;
