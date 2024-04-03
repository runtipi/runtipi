'use client';

import React from 'react';
import { useInfiniteQuery } from 'react-query';
import type { AppStoreApiResponse } from '@/api/app-store/route';
import { useInfiniteScroll } from '@/client/hooks/useInfiniteScroll';
import { EmptyPage } from '../../../../components/EmptyPage';
import { AppStoreTile } from '../AppStoreTile';
import { useAppStoreState } from '../../state/appStoreState';

interface IProps {
  initialData: AppStoreApiResponse;
}

async function searchApps({ search, category, pageParam }: { search?: string; category?: string; pageParam?: string }) {
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

export const AppStoreTable: React.FC<IProps> = ({ initialData }) => {
  const { category, search } = useAppStoreState();

  const { data, fetchNextPage, hasNextPage, isFetching, isFetchingNextPage } = useInfiniteQuery({
    queryFn: (other) => searchApps({ search, category, ...other }),
    queryKey: ['app-store', search, category],
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialData: { pages: [initialData], pageParams: [] },
    keepPreviousData: true,
  });

  const apps = data?.pages.map((page) => page.data).flat();

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
