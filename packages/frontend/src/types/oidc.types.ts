import type { GetProvidersPrivateResponse } from '@/api-client';

export interface Provider extends Omit<GetProvidersPrivateResponse['providers'][number], 'id'> {
  id: number;
}
