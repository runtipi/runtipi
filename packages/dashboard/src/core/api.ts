import axios, { Method } from 'axios';
import { useSytemStore } from '../state/systemStore';

interface IFetchParams {
  endpoint: string;
  method?: Method;
  params?: JSON;
  data?: Record<string, unknown>;
}

const api = async <T = unknown>(fetchParams: IFetchParams): Promise<T> => {
  const { endpoint, method = 'GET', params, data } = fetchParams;

  const { getState } = useSytemStore;
  const BASE_URL = `http://${getState().internalIp}:3001`;

  const response = await axios.request<T & { error?: string }>({
    method,
    params,
    data,
    url: `${BASE_URL}${endpoint}`,
    withCredentials: true,
  });

  if (response.data.error) {
    throw new Error(response.data.error);
  }

  if (response.data) return response.data;

  throw new Error(`Network request error. status : ${response.status}`);
};

export default { fetch: api };
