import React from 'react';
import { AppTableData, SortableColumns, SortDirection } from '../../helpers/table.types';
import AppStoreTile from '../AppStoreTile';
import AppStoreTableLoading from './AppStoreTable.loading';

interface IProps {
  data: AppTableData;
  onSortBy?: (value: SortableColumns) => void;
  onChangeDirection?: (value: SortDirection) => void;
  loading?: boolean;
}

const AppStoreTable: React.FC<IProps> = ({ data, loading }) => {
  if (loading) {
    return <AppStoreTableLoading />;
  }

  return (
    <div data-testid="app-store-table" className="row row-cards">
      {data.map((app) => (
        <AppStoreTile key={app.id} app={app} />
      ))}
    </div>
  );
};

export default AppStoreTable;
