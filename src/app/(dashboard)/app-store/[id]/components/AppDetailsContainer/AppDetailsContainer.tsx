import type { AppBackupsApiResponse } from '@/api/app-backups/route';
import { AppLogo } from '@/components/AppLogo';
import { AppStatus } from '@/components/AppStatus';
import type { GetAppCommand } from '@/server/services/app-catalog/commands';
import { useTranslations } from 'next-intl';
import type React from 'react';
import { AppActions } from '../AppActions';
import { AppDetailsTabs } from '../AppDetailsTabs';

type AppDetailsContainerProps = {
  app: Awaited<ReturnType<GetAppCommand['execute']>>;
  backups: AppBackupsApiResponse;
  localDomain?: string;
};

export const AppDetailsContainer: React.FC<AppDetailsContainerProps> = ({ app, localDomain, backups }) => {
  const t = useTranslations();

  return (
    <div className="card" data-testid="app-details">
      <div className="card-header d-flex flex-column flex-md-row">
        <AppLogo id={app.id} size={130} alt={app.info.name} />
        <div className="w-100 d-flex flex-column ms-md-3 align-items-center align-items-md-start">
          <div>
            <span className="mt-1 me-1">{t('APP_DETAILS_VERSION')}: </span>
            <span className="badge bg-muted mt-2 text-white">{app.info.version}</span>
          </div>
          <span className="mt-1 text-muted text-center text-md-start mb-2">{app.info.short_desc}</span>
          <div className="mb-1">
            <AppStatus appId={app.id} />
          </div>
          <AppActions localDomain={localDomain} app={app} />
        </div>
      </div>
      <AppDetailsTabs info={app.info} backups={backups} />
    </div>
  );
};
