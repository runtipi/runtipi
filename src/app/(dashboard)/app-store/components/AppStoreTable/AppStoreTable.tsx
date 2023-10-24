'use client';

import React from 'react';
import { EmptyPage } from '../../../../components/EmptyPage';
import { AppStoreTile } from '../AppStoreTile';
import { AppTableData } from '../../helpers/table.types';
import { useAppStoreState } from '../../state/appStoreState';
import { sortTable } from '../../helpers/table.helpers';

interface IProps {
  data: AppTableData;
}

export const AppStoreTable: React.FC<IProps> = ({ data }) => {
  const { category, search, sort, sortDirection } = useAppStoreState();

  const tableData = React.useMemo(() => sortTable({ data: data || [], col: sort, direction: sortDirection, category, search }), [data, sort, sortDirection, category, search]);

  if (!tableData.length) {
    return <EmptyPage title="apps.app-store.no-results" subtitle="apps.app-store.no-results-subtitle" />;
  }

  return (
    <div className="card px-3 pb-3">
      <div className="row row-cards">
        {tableData.map((app) => (
          <AppStoreTile key={app.id} app={app} />
        ))}
      </div>
    </div>
  );
};
