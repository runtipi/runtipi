import axios, { Method } from 'axios';

const BASE_URL = 'http://localhost:3001';

interface IFetchParams {
  endpoint: string;
  method?: Method;
  params?: JSON;
}

const api = async <T = unknown>(fetchParams: IFetchParams): Promise<T> => {
  const { endpoint, method = 'GET', params } = fetchParams;

  try {
    const response = await axios.request<T>({
      method,
      params,
      url: `${BASE_URL}${endpoint}`,
    });

    if (response.data) return response.data;

    throw new Error(`Network request error. status : ${response.status}`);
  } catch (error) {
    console.error('Error during fetch', `params: ${JSON.stringify(fetchParams)}`, error);

    return Promise.reject(error);
  }
};

export default { fetch: api };
