'use client';

import React from 'react';
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

  return (
    <div className="row row-cards">
      {tableData.map((app) => (
        <AppStoreTile key={app.id} app={app} />
      ))}
    </div>
  );
};
