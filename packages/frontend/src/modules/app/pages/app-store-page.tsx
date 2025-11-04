import { getEnabledAppStoresOptions, searchAppsInfiniteOptions } from '@/api-client/@tanstack/react-query.gen';
import { EmptyPage } from '@/components/empty-page/empty-page';
import { useInfiniteScroll } from '@/lib/hooks/use-infinite-scroll';
import { useAppStoreState } from '@/stores/app-store';
import { keepPreviousData, useInfiniteQuery, useSuspenseQuery } from '@tanstack/react-query';
import { Navigate, useParams, useSearchParams } from 'react-router';
import { StoreTile } from '../components/store-tile/store-tile';
import { useCallback, useEffect, useState } from 'react';
import { Input } from '@/components/ui/Input';
import { useTranslation } from 'react-i18next';
import { StoreSelector } from '@/components/store-selector/store-selector';
import { CategorySelector } from '@/components/category-selector/category-selector';
import { ActionBar } from '@/components/action-bar/action-bar';

export const AppStorePageSuspense = () => {
  return <div className="card px-3 pb-3" style={{ height: 4000 }} />;
};

export default () => {
  const params = useParams<{ storeId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();

  const selectedStore = searchParams.get('store') ?? undefined;

  const { setCategory, category, storeId, setStoreId, search: initialSearch, setSearch } = useAppStoreState();
  const [search, setLocalSearch] = useState(initialSearch);
  const { t } = useTranslation();

  useEffect(() => {
    if (selectedStore !== storeId) {
      setStoreId(selectedStore);
    }
  }, [selectedStore, setStoreId, storeId]);

  const { data: appStores } = useSuspenseQuery({
    ...getEnabledAppStoresOptions(),
  });

  const onSearch = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setLocalSearch(e.target.value);
      setSearch(e.target.value);
    },
    [setSearch],
  );

  const onSelectStore = useCallback(
    (value?: string) => {
      if (value) {
        setSearchParams({ store: value });
      } else {
        setSearchParams({});
      }
      setStoreId(value);
    },
    [setSearchParams, setStoreId],
  );

  const { data, hasNextPage, isFetchingNextPage, isFetching, fetchNextPage } = useInfiniteQuery({
    ...searchAppsInfiniteOptions({ query: { search, category, pageSize: 24, storeId } }),
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

  if (params.storeId) {
    return <Navigate to={`/app-store?store=${params.storeId}`} />;
  }

  if (isLoading) {
    return <AppStorePageSuspense />;
  }

  if (!apps?.length) {
    return (
      <>
        <ActionBar sticky>
          <ActionBar.Left>
            <Input value={search} onChange={onSearch} placeholder={t('APP_STORE_SEARCH_PLACEHOLDER')} />
          </ActionBar.Left>
          <ActionBar.Center>
            {appStores.appStores.length > 1 ? (
              <StoreSelector initialValue={selectedStore} stores={appStores.appStores} onSelect={onSelectStore} />
            ) : null}
          </ActionBar.Center>
          <ActionBar.Right>
            <CategorySelector initialValue={category} onSelect={setCategory} />
          </ActionBar.Right>
        </ActionBar>
        <EmptyPage title="APP_STORE_NO_RESULTS" subtitle="APP_STORE_NO_RESULTS_SUBTITLE" />
      </>
    );
  }

  return (
    <>
      <ActionBar sticky>
        <ActionBar.Left>
          <Input value={search} onChange={onSearch} placeholder={t('APP_STORE_SEARCH_PLACEHOLDER')} />
        </ActionBar.Left>
        <ActionBar.Center>
          {appStores.appStores.length > 1 ? (
            <StoreSelector initialValue={selectedStore} stores={appStores.appStores} onSelect={onSelectStore} />
          ) : null}
        </ActionBar.Center>
        <ActionBar.Right>
          <CategorySelector initialValue={category} onSelect={setCategory} />
        </ActionBar.Right>
      </ActionBar>
      <div className="card px-3 pb-3" style={{ borderTopRightRadius: 0, borderTopLeftRadius: 0 }}>
        <div className="row row-cards">
          {apps.map((app, index) => (
            <div ref={index === apps.length - 1 ? lastElementRef : null} key={app.urn} className="cursor-pointer col-sm-6 col-lg-4 p-2 mt-4">
              <StoreTile app={app} isLoading={isLoading} />
            </div>
          ))}
        </div>
      </div>
    </>
  );
};
