import { IconExternalLink } from '@tabler/icons-react';
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTranslations } from 'next-intl';
import { AppInfo } from '@runtipi/shared';
import Markdown from '@/components/Markdown/Markdown';
import { DataGrid, DataGridItem } from '@/components/ui/DataGrid';

interface IProps {
  info: AppInfo;
}

export const AppDetailsTabs: React.FC<IProps> = ({ info }) => {
  const t = useTranslations('apps.app-details');

  return (
    <Tabs defaultValue="description" orientation="vertical" style={{ marginTop: -1 }}>
      <TabsList>
        <TabsTrigger value="description">{t('description')}</TabsTrigger>
        <TabsTrigger value="info">{t('base-info')}</TabsTrigger>
      </TabsList>
      <TabsContent value="description">
        <Markdown className="markdown">{info.description}</Markdown>
      </TabsContent>
      <TabsContent value="info">
        <DataGrid>
          <DataGridItem title={t('source-code')}>
            <a target="_blank" rel="noreferrer" className="text-blue-500 text-xs" href={info.source}>
              {t('link')}
              <IconExternalLink size={15} className="ms-1 mb-1" />
            </a>
          </DataGridItem>
          <DataGridItem title={t('author')}>{info.author}</DataGridItem>
          <DataGridItem title={t('port')}>
            <b>{info.port}</b>
          </DataGridItem>
          <DataGridItem title={t('categories-title')}>
            {info.categories.map((c) => (
              <div key={c} className="badge text-white bg-green me-1">
                {t(`categories.${c}`)}
              </div>
            ))}
          </DataGridItem>
          <DataGridItem title={t('version')}>{info.version}</DataGridItem>
          {info.supported_architectures && (
            <DataGridItem title={t('supported-arch')}>
              {info.supported_architectures.map((a) => (
                <div key={a} className="badge text-white bg-red me-1">
                  {a.toLowerCase()}
                </div>
              ))}
            </DataGridItem>
          )}
          {info.website && (
            <DataGridItem title={t('website')}>
              <a target="_blank" rel="noreferrer" className="text-blue-500 text-xs" href={info.website}>
                {info.website}
                <IconExternalLink size={15} className="ms-1 mb-1" />
              </a>
            </DataGridItem>
          )}
        </DataGrid>
      </TabsContent>
    </Tabs>
  );
};
