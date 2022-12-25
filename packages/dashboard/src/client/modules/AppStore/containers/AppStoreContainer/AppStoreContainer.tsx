import React from 'react';
import AppStoreTable from '../../components/AppStoreTable';
import { AppTableData } from '../../helpers/table.types';

interface IProps {
  apps: AppTableData;
  loading?: boolean;
}

const AppStoreContainer: React.FC<IProps> = ({ apps, loading }) => (
  <div className="card px-3 pb-3">
    <AppStoreTable loading={loading} data={apps} />
  </div>
);

export default AppStoreContainer;
