'use client';

import { Input } from '@/components/ui/Input';
import clsx from 'clsx';
import { useTranslations } from 'next-intl';
import type React from 'react';
import { useState } from 'react';
import { useAppStoreState } from '../../state/appStoreState';
import { CategorySelector } from '../CategorySelector';
import styles from './AppStoreTableActions.module.scss';

export const AppStoreTableActions = () => {
  const { setCategory, category, search: initialSearch, setSearch } = useAppStoreState();
  const [search, setLocalSearch] = useState(initialSearch);
  const t = useTranslations();

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
        className={clsx('flex-fill mt-2 mt-md-0 me-md-2', styles.selector)}
      />
      <CategorySelector initialValue={category} className={clsx('flex-fill mt-2 mt-md-0', styles.selector)} onSelect={setCategory} />
    </div>
  );
};
