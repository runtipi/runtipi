import React from 'react';
import type { NextPage } from 'next';
import clsx from 'clsx';
import styles from './AppStorePage.module.scss';
import { useListAppsQuery } from '../../../../generated/graphql';
import { useAppStoreState } from '../../state/appStoreState';
import { Input } from '../../../../components/ui/Input';
import CategorySelector from '../../components/CategorySelector';
import { sortTable } from '../../helpers/table.helpers';
import { Layout } from '../../../../components/Layout';
import { EmptyPage } from '../../../../components/ui/EmptyPage';
import AppStoreContainer from '../../containers/AppStoreContainer';

export const AppStorePage: NextPage = () => {
  const { loading, data } = useListAppsQuery();
  const { setCategory, setSearch, category, search, sort, sortDirection } = useAppStoreState();

  const actions = (
    <div className="d-flex align-items-stretch align-items-md-center flex-column flex-md-row justify-content-end">
      <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="search" className={clsx('flex-fill mt-2 mt-md-0 me-md-2', styles.selector)} />
      <CategorySelector initialValue={category} className={clsx('flex-fill mt-2 mt-md-0', styles.selector)} onSelect={setCategory} />
    </div>
  );

  const tableData = React.useMemo(
    () => sortTable({ data: data?.listAppsInfo.apps || [], col: sort, direction: sortDirection, category, search }),
    [data?.listAppsInfo.apps, sort, sortDirection, category, search],
  );

  return (
    <Layout loading={loading && !data} title="App Store" actions={actions}>
      {(tableData.length > 0 || loading) && <AppStoreContainer loading={loading} apps={tableData} />}
      {tableData.length === 0 && <EmptyPage title="No app found" subtitle="Try to refine your search" />}
    </Layout>
  );
};
