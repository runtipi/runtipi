import React from 'react';

interface IProps {
  children: React.ReactNode;
}

export const ModalFooter: React.FC<IProps> = ({ children }) => <div className="modal-footer">{children}</div>;
