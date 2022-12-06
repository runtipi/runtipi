import React from 'react';
import { AppLogo } from '../../../../components/AppLogo/AppLogo';

const AppStoreTile: React.FC = () => (
  <div className="cursor-progress col-sm-6 col-lg-4 p-2 mt-4">
    <div className="d-flex overflow-hidden align-items-center py-2 ps-2 placeholder-glow">
      <AppLogo />
      <div className="card-body">
        <div className="placeholder col-6 mb-2" />
        <div className="text-bold h-3 placeholder col-9 mb-2" />
        <div className="text-bold h-3 placeholder col-4 mt-1 mb-2" />
      </div>
    </div>
  </div>
);

export default AppStoreTile;
