import type React from 'react';

interface IProps {
  children: React.ReactNode;
}

export const DataGrid: React.FC<IProps> = ({ children }) => (
  <div className="card">
    <div className="card-body">
      <div className="datagrid">{children}</div>
    </div>
  </div>
);
