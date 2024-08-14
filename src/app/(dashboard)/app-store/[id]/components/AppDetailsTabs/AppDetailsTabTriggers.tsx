import { TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { AppStatus } from '@runtipi/db';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import React from 'react';

interface IProps {
  status: AppStatus;
}

export const AppDetailsTabTriggers = ({ status }: IProps) => {
  const t = useTranslations();

  const router = useRouter();

  const handleTabChange = (newTab: string) => {
    void router.push(`?tab=${newTab}`);
  };

  return (
    <TabsList>
      <TabsTrigger onClick={() => handleTabChange('description')} value="description">
        {t('APP_DETAILS_DESCRIPTION')}
      </TabsTrigger>
      <TabsTrigger onClick={() => handleTabChange('info')} value="info">
        {t('APP_DETAILS_BASE_INFO')}
      </TabsTrigger>
      <TabsTrigger value="backups" onClick={() => handleTabChange('backups')} disabled={status === 'missing'}>
        {t('APP_BACKUPS_TAB_TITLE')}
      </TabsTrigger>
      <TabsTrigger onClick={() => handleTabChange('logs')} value="logs" disabled={status === 'missing'}>
        {t('APP_LOGS_TAB_TITLE')}
      </TabsTrigger>
    </TabsList>
  );
};
