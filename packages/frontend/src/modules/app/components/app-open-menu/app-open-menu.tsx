import type { MyAppsDto } from '@/api-client';
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
import { getAppUrls } from '@/modules/dashboard/helpers/app-urls';
import { IconInfoCircle, IconLock, IconLockOff } from '@tabler/icons-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';

type InstalledApp = MyAppsDto['installed'][number];

export const getAppPath = (urn: string) => {
  const [appName, storeId] = urn.split(':');
  return storeId === '_user' ? `/apps/${appName}` : `/apps/${storeId}/${appName}`;
};

type Props = {
  app: InstalledApp;
  /** Element opening the menu, rendered with `asChild` */
  children: ReactNode;
  align?: 'start' | 'end';
  /** Show the "App details" entry */
  withDetails?: boolean;
};

/**
 * Menu listing the urls an app can be opened with (domain, local domain, port), like the guest dashboard.
 */
export const AppOpenMenu = ({ app, children, align = 'start', withDetails = true }: Props) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { localDomain, sslPort } = useUserContext();

  const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
  const isRunning = app.app.status === 'running';
  const urls = isRunning ? getAppUrls(app, { hostname, localDomain, sslPort }) : [];

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
      <DropdownMenuContent align={align}>
        <DropdownMenuLabel>{app.info.name}</DropdownMenuLabel>
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
          <DropdownMenuLabel className="text-secondary fw-normal">
            {isRunning ? t('DASHBOARD_LAUNCHER_NO_LINKS') : t(`APP_STATUS_${app.app.status.toUpperCase()}`)}
          </DropdownMenuLabel>
        )}
        {withDetails && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate(getAppPath(app.info.urn))}>
              <IconInfoCircle className="me-2" size={16} />
              {t('DASHBOARD_LAUNCHER_DETAILS')}
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
