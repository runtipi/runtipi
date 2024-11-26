import type { SearchAppsDto } from '@/api-client';

export const searchAppsFn =
  ({ search, category }: { search?: string; category?: string }) =>
  async ({ pageParam }: { pageParam?: string }) => {
    const url = new URL('/api/marketplace/search', window.location.origin);

    url.searchParams.append('pageSize', '24');

    if (search) {
      url.searchParams.append('search', search);
    }

    if (category) {
      url.searchParams.append('category', category);
    }

    if (pageParam) {
      url.searchParams.append('cursor', pageParam);
    }

    const response = await fetch(url.toString());

    if (!response.ok) {
      throw new Error('Problem fetching data');
    }
    return response.json() as Promise<SearchAppsDto>;
  };
