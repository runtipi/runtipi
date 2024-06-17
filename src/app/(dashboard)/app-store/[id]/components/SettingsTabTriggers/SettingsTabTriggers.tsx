'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTranslations } from 'next-intl';

export const SettingsTabTriggers = ({ appId }: { appId: string }) => {
  const t = useTranslations();
  const router = useRouter();

  const handleTabChange = (newTab: string) => {
    router.push(`/apps/${appId}?modalTab=${newTab}`);
  };

  return (
    <TabsList>
      <TabsTrigger onClick={() => handleTabChange('general')} value="general">
        {t('APP_SETTINGS_GENERAL_TITLE')}
      </TabsTrigger>
      <TabsTrigger onClick={() => handleTabChange('backups')} value="backups">
        {t('APP_SETTINGS_BACKUPS_TITLE')}
      </TabsTrigger>
    </TabsList>
  );
};
