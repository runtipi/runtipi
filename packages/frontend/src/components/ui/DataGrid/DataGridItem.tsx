import type React from 'react';

interface IProps {
  title: string;
  children: React.ReactNode;
}

export const DataGridItem: React.FC<IProps> = ({ children, title }) => (
  <div className="datagrid-item">
    <div className="datagrid-title">{title}</div>
    <div className="datagrid-content">{children}</div>
  </div>
);
