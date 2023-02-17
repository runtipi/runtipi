import React from 'react';
import AppStoreTileLoading from '../AppStoreTile/AppStoreTile.loading';

const AppStoreTableLoading: React.FC = () => {
  const elements = Array.from({ length: 30 }, (_, i) => i);

  return (
    <div data-testid="app-store-table-loading" className="row row-cards">
      {elements.map((n) => (
        <AppStoreTileLoading key={n} />
      ))}
    </div>
  );
};

export default AppStoreTableLoading;
