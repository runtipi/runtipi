'use client';

import type { AppStoreApiResponse } from '@/api/app-store/route';
import { useInfiniteScroll } from '@/client/hooks/useInfiniteScroll';
import { keepPreviousData, useInfiniteQuery } from '@tanstack/react-query';
import type React from 'react';
import { EmptyPage } from '../../../../components/EmptyPage';
import { useAppStoreState } from '../../state/appStoreState';
import { AppStoreTile } from '../AppStoreTile';

interface IProps {
  initialData: AppStoreApiResponse;
}

export const AppStoreTable: React.FC<IProps> = ({ initialData }) => {
  const { category, search } = useAppStoreState();

  async function searchApps({ pageParam }: { pageParam?: string }) {
    const url = new URL('/api/app-store', window.location.origin);

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
    return response.json() as Promise<AppStoreApiResponse>;
  }

  const { data, fetchNextPage, hasNextPage, isFetching, isFetchingNextPage } = useInfiniteQuery({
    queryFn: searchApps,
    queryKey: ['app-store', search, category],
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialData: { pages: [initialData], pageParams: [] },
    placeholderData: keepPreviousData,
  });

  const apps = data?.pages.flatMap((page) => page.data);

  const { lastElementRef } = useInfiniteScroll({
    fetchNextPage,
    hasNextPage: Boolean(hasNextPage),
    isFetching: isFetchingNextPage || isFetching,
  });

  if (!apps?.length) {
    return <EmptyPage title="APP_STORE_NO_RESULTS" subtitle="APP_STORE_NO_RESULTS_SUBTITLE" />;
  }

  return (
    <div className="card px-3 pb-3">
      <div className="row row-cards">
        {apps.map((app, index) => (
          <div ref={index === apps.length - 1 ? lastElementRef : null} key={app.id} className="cursor-pointer col-sm-6 col-lg-4 p-2 mt-4">
            <AppStoreTile app={app} />
          </div>
        ))}
      </div>
    </div>
  );
};
