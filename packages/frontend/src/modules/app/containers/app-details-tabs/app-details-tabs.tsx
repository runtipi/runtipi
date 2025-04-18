import { Markdown } from '@/components/markdown/markdown';
import { Alert, AlertDescription, AlertHeading, AlertIcon } from '@/components/ui/Alert/Alert';
import { DataGrid, DataGridItem } from '@/components/ui/DataGrid';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/DropdownMenu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { AppDetails, AppInfo, AppMetadata } from '@/types/app.types';
import { IconAlertCircle, IconExternalLink } from '@tabler/icons-react';
import { Suspense, lazy } from 'react';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router';

const AppBackups = lazy(() => import('../app-backups/app-backups').then((module) => ({ default: module.AppBackups })));
const AppLogs = lazy(() => import('../app-logs/app-logs').then((module) => ({ default: module.AppLogs })));

interface IProps {
  info: AppInfo;
  app?: AppDetails | null;
  metadata?: AppMetadata;
}

export const AppDetailsTabs = ({ info, app, metadata }: IProps) => {
  const { t } = useTranslation();

  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [currentTab, setCurrentTab] = React.useState(params.get('tab') || 'description');

  const handleTabChange = (newTab: string) => {
    setCurrentTab(newTab);
    navigate(`?tab=${newTab}`, { replace: true });
  };

  return (
    <Tabs value={currentTab} orientation="vertical" style={{ marginTop: -1 }}>
      <TabsList>
        <TabsTrigger onClick={() => handleTabChange('description')} value="description">
          {t('APP_DETAILS_DESCRIPTION')}
        </TabsTrigger>
        <TabsTrigger onClick={() => handleTabChange('info')} value="info">
          {t('APP_DETAILS_BASE_INFO')}
        </TabsTrigger>
        <TabsTrigger value="backups" onClick={() => handleTabChange('backups')} disabled={!app} className="d-none d-md-block">
          {t('APP_BACKUPS_TAB_TITLE')}
        </TabsTrigger>
        <TabsTrigger onClick={() => handleTabChange('logs')} value="logs" disabled={!app} className="d-none d-md-block">
          {t('APP_LOGS_TAB_TITLE')}
        </TabsTrigger>
        <DropdownMenu>
          <DropdownMenuTrigger className="nav-link dropdown-toggle d-block d-md-none">{t('MORE')}</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => handleTabChange('backups')}>{t('APP_BACKUPS_TAB_TITLE')}</DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleTabChange('logs')}>{t('APP_LOGS_TAB_TITLE')}</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TabsList>
      <TabsContent value="description">
        {info.deprecated && (
          <Alert variant="danger" className="mb-4">
            <AlertIcon>
              <IconAlertCircle stroke={2} />
            </AlertIcon>
            <div>
              <AlertHeading>{t('APP_DETAILS_DEPRECATED_ALERT_TITLE')}</AlertHeading>
              <AlertDescription>{t('APP_DETAILS_DEPRECATED_ALERT_SUBTITLE')}</AlertDescription>
            </div>
          </Alert>
        )}
        <Markdown content={info.description || ''} className="markdown" />
      </TabsContent>
      <TabsContent value="backups">
        <Suspense>
          <AppBackups info={info} status={app?.status ?? 'missing'} />
        </Suspense>
      </TabsContent>
      <TabsContent value="info">
        <DataGrid>
          <DataGridItem title={t('APP_DETAILS_SOURCE_CODE')}>
            <a target="_blank" rel="noreferrer" className="text-blue-500 text-xs" href={info.source}>
              {t('APP_DETAILS_LINK')}
              <IconExternalLink size={15} className="ms-1 mb-1" />
            </a>
          </DataGridItem>
          <DataGridItem title={t('APP_DETAILS_AUTHOR')}>{info.author}</DataGridItem>
          <DataGridItem title={t('APP_DETAILS_PORT')}>
            <b>{info.port}</b>
          </DataGridItem>
          <DataGridItem title={t('APP_DETAILS_CATEGORIES_TITLE')}>
            {info.categories?.map((c) => (
              <div key={c} className="badge text-white bg-green me-1">
                {t(`APP_CATEGORY_${c.toUpperCase() as Uppercase<typeof c>}`)}
              </div>
            ))}
          </DataGridItem>
          <DataGridItem title={t('APP_DETAILS_VERSION')}>{info.version}</DataGridItem>
          {info.supported_architectures && (
            <DataGridItem title={t('APP_DETAILS_SUPPORTED_ARCH')}>
              {info.supported_architectures.map((a) => (
                <div key={a} className="badge text-white bg-red me-1">
                  {a.toLowerCase()}
                </div>
              ))}
            </DataGridItem>
          )}
          {info.website && (
            <DataGridItem title={t('APP_DETAILS_WEBSITE')}>
              <a target="_blank" rel="noreferrer" className="text-blue-500 text-xs" href={info.website}>
                {info.website}
                <IconExternalLink size={15} className="ms-1 mb-1" />
              </a>
            </DataGridItem>
          )}
          {metadata && (
            <DataGridItem title={t('APP_DETAILS_USER_CONFIG')}>
              <b>{metadata.hasCustomConfig ? t('YES') : t('NO')}</b>
            </DataGridItem>
          )}
        </DataGrid>
      </TabsContent>
      <TabsContent value="logs">
        {app?.status === 'running' && (
          <Suspense>
            <AppLogs appUrn={info.urn} />
          </Suspense>
        )}
      </TabsContent>
    </Tabs>
  );
};
