import React from 'react';
import { IToast, useToastStore } from '../../../state/toastStore';
import { Toast } from '../../ui/Toast';

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { toasts, removeToast } = useToastStore();

  const renderToast = (toast: IToast) => {
    const { status, title, description, id } = toast;

    return <Toast status={status} title={title} message={description} id={id} onClose={() => removeToast(id)} />;
  };

  return (
    <>
      {toasts.map((toast) => (
        <div key={toast.id} className="position-fixed bottom-0 end-0 p-3" style={{ zIndex: 11 }}>
          {renderToast(toast)}
        </div>
      ))}
      {children}
    </>
  );
};
