import React from 'react';
import type { NextPage } from 'next';
import clsx from 'clsx';
import { useTranslations } from 'next-intl';
import styles from './AppStorePage.module.scss';
import { useAppStoreState } from '../../state/appStoreState';
import { Input } from '../../../../components/ui/Input';
import CategorySelector from '../../components/CategorySelector';
import { sortTable } from '../../helpers/table.helpers';
import { Layout } from '../../../../components/Layout';
import { EmptyPage } from '../../../../components/ui/EmptyPage';
import AppStoreContainer from '../../containers/AppStoreContainer';
import { ErrorPage } from '../../../../components/ui/ErrorPage';
import { trpc } from '../../../../utils/trpc';

export const AppStorePage: NextPage = () => {
  const t = useTranslations('apps.app-store');
  const { data, isLoading, error } = trpc.app.listApps.useQuery();
  const { setCategory, setSearch, category, search, sort, sortDirection } = useAppStoreState();

  const actions = (
    <div className="d-flex align-items-stretch align-items-md-center flex-column flex-md-row justify-content-end">
      <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('search-placeholder')} className={clsx('flex-fill mt-2 mt-md-0 me-md-2', styles.selector)} />
      <CategorySelector initialValue={category} className={clsx('flex-fill mt-2 mt-md-0', styles.selector)} onSelect={setCategory} />
    </div>
  );

  const tableData = React.useMemo(() => sortTable({ data: data?.apps || [], col: sort, direction: sortDirection, category, search }), [data?.apps, sort, sortDirection, category, search]);

  return (
    <Layout title={t('title')} actions={actions}>
      {(tableData.length > 0 || isLoading) && <AppStoreContainer loading={isLoading} apps={tableData} />}
      {tableData.length === 0 && !error && <EmptyPage title={t('no-results')} subtitle={t('no-results-subtitle')} />}
      {error && <ErrorPage error={error.message} />}
    </Layout>
  );
};
