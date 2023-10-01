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
        {t('settings.actions.tab-title')}
      </TabsTrigger>
      <TabsTrigger onClick={() => handleTabChange('settings')} value="settings">
        {t('settings.settings.tab-title')}
      </TabsTrigger>
      <TabsTrigger onClick={() => handleTabChange('security')} value="security">
        {t('settings.security.tab-title')}
      </TabsTrigger>
    </TabsList>
  );
};
