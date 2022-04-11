import { BareFetcher } from 'swr';
import axios from 'axios';

const fetcher: BareFetcher<any> = (url: string) => {
  return axios.get(url, { baseURL: 'http://localhost:3001' }).then((res) => res.data);
};

export default fetcher;
