import { Input } from '@/components/ui/Input';
import clsx from 'clsx';
import type React from 'react';
import { useState } from 'react';
import { useAppStoreState } from '@/stores/app-store';
import { useTranslation } from 'react-i18next';
import './app-store-layout-actions.css';
import { CategorySelector } from '../category-selector/category-selector';

export const AppStoreLayoutActions = () => {
  const { setCategory, category, search: initialSearch, setSearch } = useAppStoreState();
  const [search, setLocalSearch] = useState(initialSearch);
  const { t } = useTranslation();

  const onSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalSearch(e.target.value);
    setSearch(e.target.value);
  };

  return (
    <div className="d-flex align-items-stretch align-items-md-center flex-column flex-md-row justify-content-end">
      <Input
        value={search}
        onChange={onSearch}
        placeholder={t('APP_STORE_SEARCH_PLACEHOLDER')}
        className={clsx('flex-fill mt-2 mt-md-0 me-md-2 search-input')}
      />
      <CategorySelector initialValue={category} className={clsx('flex-fill mt-2 mt-md-0 search-input')} onSelect={setCategory} />
    </div>
  );
};
