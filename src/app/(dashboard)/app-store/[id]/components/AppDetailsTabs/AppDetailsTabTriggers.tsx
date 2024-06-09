import React from 'react';
import { TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTranslations } from 'next-intl';
import { AppStatus } from '@/server/db/schema';
import { useRouter } from 'next/navigation';

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
      <TabsTrigger onClick={() => handleTabChange('logs')} value="logs" disabled={status === 'missing'}>
        {t('APP_LOGS_TAB_TITLE')}
      </TabsTrigger>
    </TabsList>
  );
};
