import { Markdown } from '@/components/markdown/markdown';
import { DataGrid, DataGridItem } from '@/components/ui/DataGrid';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { AppDetails, AppInfo, UserCompose } from '@/types/app.types';
import { IconAlertCircle, IconExternalLink } from '@tabler/icons-react';
import { Suspense, lazy } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';

const AppBackups = lazy(() => import('../app-backups/app-backups').then((module) => ({ default: module.AppBackups })));
const AppLogs = lazy(() => import('../app-logs/app-logs').then((module) => ({ default: module.AppLogs })));

interface IProps {
  info: AppInfo;
  app: AppDetails;
  userCompose: UserCompose
}

export const AppDetailsTabs = ({ info, app, userCompose }: IProps) => {
  const { t } = useTranslation();

  const [params] = useSearchParams();
  const defaultTab = params.get('tab') || 'description';
  const navigate = useNavigate();

  const handleTabChange = (newTab: string) => {
    navigate(`?tab=${newTab}`, { replace: true });
  };

  return (
    <Tabs defaultValue={defaultTab} orientation="vertical" style={{ marginTop: -1 }}>
      <TabsList>
        <TabsTrigger onClick={() => handleTabChange('description')} value="description">
          {t('APP_DETAILS_DESCRIPTION')}
        </TabsTrigger>
        <TabsTrigger onClick={() => handleTabChange('info')} value="info">
          {t('APP_DETAILS_BASE_INFO')}
        </TabsTrigger>
        <TabsTrigger value="backups" onClick={() => handleTabChange('backups')} disabled={app.status === 'missing'}>
          {t('APP_BACKUPS_TAB_TITLE')}
        </TabsTrigger>
        <TabsTrigger onClick={() => handleTabChange('logs')} value="logs" disabled={app.status === 'missing'}>
          {t('APP_LOGS_TAB_TITLE')}
        </TabsTrigger>
      </TabsList>
      <TabsContent value="description">
        {info.deprecated && (
          <aside className="alert alert-danger" aria-live="assertive">
            <div className="d-flex">
              <div>
                <IconAlertCircle />
              </div>
              <div className="ms-2">
                <h4 className="alert-title">{t('APP_DETAILS_DEPRECATED_ALERT_TITLE')}</h4>
                <div className="text-secondary">{t('APP_DETAILS_DEPRECATED_ALERT_SUBTITLE')} </div>
              </div>
            </div>
          </aside>
        )}
        <Markdown content={info.description || ''} className="markdown" />
      </TabsContent>
      <TabsContent value="backups">
        <Suspense>
          <AppBackups info={info} status={app.status} />
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
          {
            app.status !== "missing" && (
              <DataGridItem title={t('APP_DETAILS_USER_COMPOSE')}>
                {userCompose.content ? t("APP_DETAILS_USER_COMPOSE_YES") : t("APP_DETAILS_USER_COMPOSE_NO")}
              </DataGridItem>
            )
          }
        </DataGrid>
      </TabsContent>
      <TabsContent value="logs">
        {app.status === 'running' && (
          <Suspense>
            <AppLogs appId={info.id} />
          </Suspense>
        )}
      </TabsContent>
    </Tabs>
  );
};
