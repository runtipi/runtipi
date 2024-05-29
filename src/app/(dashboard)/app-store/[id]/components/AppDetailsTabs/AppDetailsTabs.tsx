import { IconAlertCircle, IconExternalLink } from '@tabler/icons-react';
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTranslations } from 'next-intl';
import { AppInfo } from '@runtipi/shared';
import { Markdown } from '@/components/Markdown';
import { DataGrid, DataGridItem } from '@/components/ui/DataGrid';
import { AppStatus as AppStatusEnum } from '@/server/db/schema';
import { LogsTerminal } from './LogsTerminal';

interface IProps {
  info: AppInfo;
  status: AppStatusEnum;
}

export const AppDetailsTabs: React.FC<IProps> = ({ info, status }) => {
  const t = useTranslations();

  return (
    <Tabs defaultValue="description" orientation="vertical" style={{ marginTop: -1 }}>
      <TabsList>
        <TabsTrigger value="description">{t('APP_DETAILS_DESCRIPTION')}</TabsTrigger>
        <TabsTrigger value="info">{t('APP_DETAILS_BASE_INFO')}</TabsTrigger>
        <TabsTrigger disabled={status === 'missing'} value="logs">
          Logs
        </TabsTrigger>
      </TabsList>
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
      <TabsContent value="logs">{status === 'running' && <LogsTerminal appId={info.id} />}</TabsContent>
    </Tabs>
  );
};
