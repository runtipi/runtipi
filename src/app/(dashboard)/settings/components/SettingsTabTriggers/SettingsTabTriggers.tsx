'use client';

import { TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

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
        {t('SETTINGS_LOGS_TAB_TITLE')}
      </TabsTrigger>
    </TabsList>
  );
};
