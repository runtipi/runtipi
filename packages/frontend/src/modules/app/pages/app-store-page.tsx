import { searchAppsInfiniteOptions } from '@/api-client/@tanstack/react-query.gen';
import { EmptyPage } from '@/components/empty-page/empty-page';
import { useInfiniteScroll } from '@/lib/hooks/use-infinite-scroll';
import { useAppStoreState } from '@/stores/app-store';
import { keepPreviousData, useInfiniteQuery } from '@tanstack/react-query';
import { StoreTile } from '../components/store-tile/store-tile';

export const AppStorePageSuspense = () => {
  return <div className="card px-3 pb-3" style={{ height: 4000 }} />;
};

export const AppStorePage = () => {
  const { category, search } = useAppStoreState();

  const { data, hasNextPage, isFetchingNextPage, isFetching, fetchNextPage } = useInfiniteQuery({
    ...searchAppsInfiniteOptions({ query: { search, category, pageSize: 24 } }),
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    placeholderData: keepPreviousData,
  });

  const isLoading = !data;
  const apps = data?.pages.flatMap((page) => page.data) ?? [];

  const { lastElementRef } = useInfiniteScroll({
    fetchNextPage,
    hasNextPage: Boolean(hasNextPage),
    isFetching: isFetchingNextPage || isFetching,
  });

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
          <div ref={index === apps.length - 1 ? lastElementRef : null} key={app.id} className="cursor-pointer col-sm-6 col-lg-4 p-2 mt-4">
            <StoreTile app={app} isLoading={isLoading} />
          </div>
        ))}
      </div>
    </div>
  );
};
