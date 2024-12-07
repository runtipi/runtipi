import { Input } from '@/components/ui/Input';
import { useAppStoreState } from '@/stores/app-store';
import clsx from 'clsx';
import type React from 'react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import './app-store-layout-actions.css';
import { getEnabledAppStoresOptions } from '@/api-client/@tanstack/react-query.gen';
import { useSuspenseQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router';
import { CategorySelector } from '../category-selector/category-selector';
import { StoreSelector } from '../store-selector/store-selector';

export const AppStoreLayoutActions = () => {
  const { setCategory, category, setStoreId, search: initialSearch, setSearch } = useAppStoreState();
  const [search, setLocalSearch] = useState(initialSearch);
  const { t } = useTranslation();

  const { data } = useSuspenseQuery({
    ...getEnabledAppStoresOptions(),
  });

  const onSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalSearch(e.target.value);
    setSearch(e.target.value);
  };

  const [params, setParams] = useSearchParams();
  const selectedStore = params.get('store') ?? undefined;

  useEffect(() => {
    if (selectedStore) {
      setStoreId(Number.parseInt(selectedStore));
    }
  }, [selectedStore, setStoreId]);

  const onSelectStore = (value?: string) => {
    if (value) {
      setParams({ store: value });
    } else {
      setParams({});
    }
    setStoreId(value ? Number.parseInt(value) : undefined);
  };

  return (
    <div className="d-flex align-items-stretch align-items-md-center flex-column flex-md-row justify-content-end">
      <Input
        value={search}
        onChange={onSearch}
        placeholder={t('APP_STORE_SEARCH_PLACEHOLDER')}
        className={clsx('flex-fill mt-2 mt-md-0 me-md-2 search-input')}
      />
      {data.appStores.length > 1 && (
        <StoreSelector
          initialValue={selectedStore}
          stores={data.appStores}
          className={clsx('flex-fill mt-2 mt-md-0 search-input me-2')}
          onSelect={onSelectStore}
        />
      )}
      <CategorySelector initialValue={category} className={clsx('flex-fill mt-2 mt-md-0 search-input')} onSelect={setCategory} />
    </div>
  );
};
