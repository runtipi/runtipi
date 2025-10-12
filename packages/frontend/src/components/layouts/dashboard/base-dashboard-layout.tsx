import type { PropsWithChildren, ReactNode } from 'react';
import './layout.css';

type BaseDashboardLayoutProps = PropsWithChildren<{
  header: ReactNode;
  pageTitle?: ReactNode;
  layoutActions?: ReactNode;
  showPageHeader?: boolean;
}>;

export const BaseDashboardLayout = ({ header, pageTitle, layoutActions, showPageHeader = true, children }: BaseDashboardLayoutProps) => {
  return (
    <div className="page">
      {header}
      <div className="page-wrapper">
        {showPageHeader && (
          <div className="page-header d-print-none">
            <div className="container-xl">
              <div className="row g-2 align-items-center">
                <div className="col text-white">{pageTitle}</div>
                {layoutActions && <div className="col-auto ms-auto">{layoutActions}</div>}
              </div>
            </div>
          </div>
        )}
        <div className="page-body">
          <div className="container-xl">{children}</div>
        </div>
      </div>
    </div>
  );
};
