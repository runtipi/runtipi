import { Input } from '@/components/ui/Input';
import { useAppStoreState } from '@/stores/app-store';
import type React from 'react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getEnabledAppStoresOptions } from '@/api-client/@tanstack/react-query.gen';
import { useSuspenseQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router';
import { CategorySelector } from '@/components/category-selector/category-selector';
import { StoreSelector } from '@/components/store-selector/store-selector';

export const AppStoreActions = () => {
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

  useEffect(() => {
    if (selectedStore) {
      setStoreId(selectedStore);
    }
  }, [setStoreId]);

  const [params, setParams] = useSearchParams();
  const selectedStore = params.get('store') ?? undefined;

  const onSelectStore = (value?: string) => {
    if (value) {
      setParams({ store: value });
    } else {
      setParams({});
    }
    setStoreId(value);
  };

  return (
    <>
      <Input
        value={search}
        onChange={onSearch}
        placeholder={t('APP_STORE_SEARCH_PLACEHOLDER')}
      />
      {data.appStores.length > 1 && (
        <StoreSelector
          initialValue={selectedStore}
          stores={data.appStores}
          onSelect={onSelectStore}
        />
      )}
      <CategorySelector
        initialValue={category}
        onSelect={setCategory}
      />
    </>
  );
};
