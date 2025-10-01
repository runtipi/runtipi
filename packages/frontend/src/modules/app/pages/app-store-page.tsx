import { searchAppsInfiniteOptions, getInstalledAppsOptions } from '@/api-client/@tanstack/react-query.gen';
import { EmptyPage } from '@/components/empty-page/empty-page';
import { useInfiniteScroll } from '@/lib/hooks/use-infinite-scroll';
import { useAppStoreState } from '@/stores/app-store';
import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { Navigate, useParams } from 'react-router';
import { StoreTile } from '../components/store-tile/store-tile';
import { useMemo } from 'react';

export const AppStorePageSuspense = () => {
  return <div className="card px-3 pb-3" style={{ height: 4000 }} />;
};

export default () => {
  const params = useParams<{ storeId: string }>();

  const { category, search, storeId } = useAppStoreState();

  const { data, hasNextPage, isFetchingNextPage, isFetching, fetchNextPage } = useInfiniteQuery({
    ...searchAppsInfiniteOptions({ query: { search, category, pageSize: 24, storeId } }),
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    placeholderData: keepPreviousData,
  });

  // Fetch installed apps to identify which apps are already installed
  const { data: installedAppsData } = useQuery({
    ...getInstalledAppsOptions(),
  });

  // Create a Set of installed app URNs for O(1) lookup performance
  const installedUrns = useMemo(() => {
    if (!installedAppsData?.installed) return new Set<string>();
    return new Set(installedAppsData.installed.map((item) => item.info.urn));
  }, [installedAppsData]);

  const isLoading = !data;
  const apps = data?.pages.flatMap((page) => page.data) ?? [];

  const { lastElementRef } = useInfiniteScroll({
    fetchNextPage,
    hasNextPage: Boolean(hasNextPage),
    isFetching: isFetchingNextPage || isFetching,
  });

  if (params.storeId) {
    return <Navigate to={`/app-store?store=${params.storeId}`} />;
  }

  if (isLoading) {
    return <AppStorePageSuspense />;
  }

  if (!apps?.length) {
    return <EmptyPage title="APP_STORE_NO_RESULTS" subtitle="APP_STORE_NO_RESULTS_SUBTITLE" />;
  }

  return (
    <div className="card px-3 pb-3">
      <div className="row row-cards">
        {apps.map((app, index) => (
          <div ref={index === apps.length - 1 ? lastElementRef : null} key={app.urn} className="cursor-pointer col-sm-6 col-lg-4 p-2 mt-4">
            <StoreTile app={app} isLoading={isLoading} isInstalled={installedUrns.has(app.urn)} />
          </div>
        ))}
      </div>
    </div>
  );
};
