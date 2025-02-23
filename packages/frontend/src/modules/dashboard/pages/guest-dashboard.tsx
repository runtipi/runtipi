import type { GuestAppsDto } from '@/api-client';
import { getGuestAppsOptions } from '@/api-client/@tanstack/react-query.gen';
import { GuestHeader } from '@/components/header/guest-header';
import { PageTitle } from '@/components/page-title/page-title';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu';
import { AppTile } from '@/modules/app/components/app-tile/app-tile';
import { IconLock, IconLockOff } from '@tabler/icons-react';
import { useSuspenseQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import './guest-dashboard.css';
import { EmptyPage } from '@/components/empty-page/empty-page';

const Tile = ({ data, localDomain }: { data: GuestAppsDto['installed'][number]; localDomain: string }) => {
  const { t } = useTranslation();

  const { info, app } = data;

  const hostname = typeof window !== 'undefined' ? window.location.hostname : '';

  const handleOpen = (type: string) => {
    let url = '';
    const { https } = info;
    const protocol = https ? 'https' : 'http';

    if (typeof window !== 'undefined') {
      // Current domain
      const domain = window.location.hostname;
      url = `${protocol}://${domain}:${info.port}${info.url_suffix || ''}`;
    }

    if (type === 'domain' && app.domain) {
      url = `https://${app.domain}${info.url_suffix || ''}`;
    }

    if (type === 'localDomain' && app.exposedLocal) {
      url = `https://${app.id}.${localDomain}${info.url_suffix || ''}`;
    }

    window.open(url, '_blank', 'noreferrer');
  };

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <div className="col-sm-6 col-lg-4 app-link">
          <AppTile key={app.id} info={info} status={app.status} updateAvailable={false} />
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>{t('APP_DETAILS_CHOOSE_OPEN_METHOD')}</DropdownMenuLabel>
        <DropdownMenuGroup>
          {app.exposed && app.domain && (
            <DropdownMenuItem onClick={() => handleOpen('domain')}>
              <IconLock className="text-green me-2" size={16} />
              {app.domain}
            </DropdownMenuItem>
          )}
          {app.exposedLocal && (
            <DropdownMenuItem onClick={() => handleOpen('localDomain')}>
              <IconLock className="text-muted me-2" size={16} />
              {app.id}.{localDomain}
            </DropdownMenuItem>
          )}
          {(app.openPort || !info.dynamic_config) && (
            <DropdownMenuItem onClick={() => handleOpen('port')}>
              <IconLockOff className="text-muted me-2" size={16} />
              {hostname}:{info.port}
            </DropdownMenuItem>
          )}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export const GuestDashboard = () => {
  const { data } = useSuspenseQuery({
    ...getGuestAppsOptions(),
  });

  return (
    <div className="page">
      <GuestHeader />
      <div className="page-wrapper">
        <div className="page-header d-print-none">
          <div className="container-xl">
            <div className={'row g-2 align-items-center'}>
              <div className="col text-white">
                <PageTitle apps={[]} />
              </div>
            </div>
          </div>
        </div>
        <div className="page-body">
          <div className="container-xl">
            {data.installed.length === 0 && <EmptyPage title="GUEST_DASHBOARD_NO_APPS" subtitle="GUEST_DASHBOARD_NO_APPS_SUBTITLE" />}
            <div className="row row-cards">
              {data.installed.map((appData) => {
                return <Tile key={appData.app.id} data={appData} localDomain={data.localDomain} />;
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
