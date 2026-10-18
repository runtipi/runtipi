import type { MyAppsDto } from '@/api-client';
import { AppLogo } from '@/components/app-logo/app-logo';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu';
import { DropdownMenuSeparator } from '@/components/ui/DropdownMenu/DropdownMenu';
import { useUserContext } from '@/context/user-context';
import { IconInfoCircle, IconLock, IconLockOff } from '@tabler/icons-react';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { getAppUrls, isUpdateAvailable } from '../../helpers/app-urls';
import './app-launcher.css';

type InstalledApp = MyAppsDto['installed'][number];

const getAppPath = (urn: string) => {
  const [appName, storeId] = urn.split(':');
  return `/apps/${storeId}/${appName}`;
};

const statusOrder = (app: InstalledApp) => (app.app.status === 'running' ? 0 : 1);

/**
 * Grid of app icons. Clicking an icon opens a menu with the urls the app can be opened with.
 */
export const AppLauncher = ({ installed }: { installed: InstalledApp[] }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { localDomain, sslPort } = useUserContext();

  const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
  const apps = installed
    .filter(({ info }) => info.available)
    .sort((a, b) => statusOrder(a) - statusOrder(b) || a.info.name.localeCompare(b.info.name));

  if (apps.length === 0) return null;

  return (
    <div className="col-12 px-1">
      <div className="app-launcher" data-testid="app-launcher">
        {apps.map((installedApp) => {
          const { app, info } = installedApp;
          const isRunning = app.status === 'running';
          const urls = isRunning ? getAppUrls(installedApp, { hostname, localDomain, sslPort }) : [];
          const status = t(`APP_STATUS_${app.status.toUpperCase()}`);

          return (
            <DropdownMenu key={info.urn} modal={false}>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className={clsx('app-launcher-tile card', { 'app-launcher-tile-inactive': !isRunning })}
                  aria-label={`${info.name} (${status})`}
                >
                  <span className="app-launcher-logo">
                    <AppLogo alt="" urn={info.urn} size={56} />
                    <span
                      className={clsx('app-launcher-status status-dot', {
                        'status-green': isRunning,
                        'status-red': app.status === 'stopped',
                        'status-gray status-dot-animated': !isRunning && app.status !== 'stopped',
                      })}
                      title={status}
                    />
                    {isUpdateAvailable(installedApp) && <span className="app-launcher-update badge bg-green" title={t('MY_APPS_UPDATE_AVAILABLE')} />}
                  </span>
                  <span className="app-launcher-name text-truncate">{info.name}</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuLabel>{info.name}</DropdownMenuLabel>
                {urls.length > 0 ? (
                  <DropdownMenuGroup>
                    {urls.map((url) => (
                      <DropdownMenuItem key={url.type} onClick={() => window.open(url.url, '_blank', 'noreferrer')}>
                        {url.secure ? <IconLock className="text-green me-2" size={16} /> : <IconLockOff className="text-muted me-2" size={16} />}
                        {url.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuGroup>
                ) : (
                  <DropdownMenuLabel className="text-secondary fw-normal">{isRunning ? t('DASHBOARD_LAUNCHER_NO_LINKS') : status}</DropdownMenuLabel>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate(getAppPath(info.urn))}>
                  <IconInfoCircle className="me-2" size={16} />
                  {t('DASHBOARD_LAUNCHER_DETAILS')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        })}
      </div>
    </div>
  );
};
