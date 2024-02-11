'use client';

import clsx from 'clsx';
import React from 'react';
import { Input } from '@/components/ui/Input';
import { useTranslations } from 'next-intl';
import styles from './AppStoreTableActions.module.scss';
import { useAppStoreState } from '../../state/appStoreState';
import { CategorySelector } from '../CategorySelector';

export const AppStoreTableActions = () => {
  const { setCategory, category, search, setSearch } = useAppStoreState();
  const t = useTranslations();

  return (
    <div className="d-flex align-items-stretch align-items-md-center flex-column flex-md-row justify-content-end">
      <Input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={t('APP_STORE_SEARCH_PLACEHOLDER')}
        className={clsx('flex-fill mt-2 mt-md-0 me-md-2', styles.selector)}
      />
      <CategorySelector initialValue={category} className={clsx('flex-fill mt-2 mt-md-0', styles.selector)} onSelect={setCategory} />
    </div>
  );
};
