import React from 'react';

interface IProps {
  children: React.ReactNode;
}

export const ModalHeader: React.FC<IProps> = ({ children }) => (
  <div data-testid="modal-header" className="modal-header">
    {children}
  </div>
);
