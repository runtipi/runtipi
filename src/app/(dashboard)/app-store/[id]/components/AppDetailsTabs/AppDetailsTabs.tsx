'use client';

import type { AppBackupsApiResponse } from '@/api/app-backups/route';
import { Markdown } from '@/components/Markdown';
import { DataGrid, DataGridItem } from '@/components/ui/DataGrid';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { useAppStatus } from '@/hooks/useAppStatus';
import type { AppInfo } from '@runtipi/shared';
import { IconAlertCircle, IconExternalLink } from '@tabler/icons-react';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { AppBackups } from './AppBackups';
import { AppDetailsTabTriggers } from './AppDetailsTabTriggers';
import { AppLogs } from './AppLogs';

interface IProps {
  info: AppInfo;
  backups: AppBackupsApiResponse;
}

export const AppDetailsTabs = ({ info, backups }: IProps) => {
  const t = useTranslations();
  const appStatus = useAppStatus((state) => state.statuses[info.id]) || 'missing';

  const defaultTab = useSearchParams().get('tab');

  return (
    <Tabs defaultValue={defaultTab || 'description'} orientation="vertical" style={{ marginTop: -1 }}>
      <AppDetailsTabTriggers status={appStatus} />
      <TabsContent value="description">
        {info.deprecated && (
          <div className="alert alert-danger" role="alert">
            <div className="d-flex">
              <div>
                <IconAlertCircle />
              </div>
              <div className="ms-2">
                <h4 className="alert-title">{t('APP_DETAILS_DEPRECATED_ALERT_TITLE')}</h4>
                <div className="text-secondary">{t('APP_DETAILS_DEPRECATED_ALERT_SUBTITLE')} </div>
              </div>
            </div>
          </div>
        )}
        <Markdown className="markdown">{info.description}</Markdown>
      </TabsContent>
      <TabsContent value="backups">
        <AppBackups info={info} initialData={backups} />
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
            {info.categories.map((c) => (
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
        </DataGrid>
      </TabsContent>
      <TabsContent value="logs">{appStatus === 'running' && <AppLogs appId={info.id} />}</TabsContent>
    </Tabs>
  );
};
