'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTranslations } from 'next-intl';

export const SettingsTabTriggers = () => {
  const t = useTranslations();
  const router = useRouter();

  const handleTabChange = (newTab: string) => {
    router.push(`/settings?tab=${newTab}`);
  };

  return (
    <TabsList>
      <TabsTrigger onClick={() => handleTabChange('actions')} value="actions">
        {t('SETTINGS_ACTIONS_TAB_TITLE')}
      </TabsTrigger>
      <TabsTrigger onClick={() => handleTabChange('settings')} value="settings">
        {t('SETTINGS_GENERAL_TAB_TITLE')}
      </TabsTrigger>
      <TabsTrigger onClick={() => handleTabChange('security')} value="security">
        {t('SETTINGS_SECURITY_TAB_TITLE')}
      </TabsTrigger>
      <TabsTrigger onClick={() => handleTabChange('logs')} value="logs">
        {t('LOGS')}
      </TabsTrigger>
    </TabsList>
  );
};
