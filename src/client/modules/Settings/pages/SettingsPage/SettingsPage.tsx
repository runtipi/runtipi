import React from 'react';
import type { NextPage } from 'next';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/router';
import { Layout } from '../../../../components/Layout';
import { GeneralActions } from '../../containers/GeneralActions';
import { SettingsContainer } from '../../containers/SettingsContainer';
import { SecurityContainer } from '../../containers/SecurityContainer';

export const SettingsPage: NextPage = () => {
  const t = useTranslations('settings');
  const router = useRouter();
  const { tab } = router.query;

  const handleTabChange = (newTab: string) => {
    router.push(`/settings?tab=${newTab}`);
  };

  return (
    <Layout title={t('title')}>
      <div className="card d-flex">
        <Tabs defaultValue={(tab as string) || 'actions'}>
          <TabsList>
            <TabsTrigger onClick={() => handleTabChange('actions')} value="actions">
              {t('actions.tab-title')}
            </TabsTrigger>
            <TabsTrigger onClick={() => handleTabChange('settings')} value="settings">
              {t('settings.tab-title')}
            </TabsTrigger>
            <TabsTrigger onClick={() => handleTabChange('security')} value="security">
              {t('security.tab-title')}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="actions">
            <GeneralActions />
          </TabsContent>
          <TabsContent value="settings">
            <SettingsContainer />
          </TabsContent>
          <TabsContent value="security">
            <SecurityContainer />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};
