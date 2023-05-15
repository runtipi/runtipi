import React from 'react';
import type { NextPage } from 'next';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTranslations } from 'next-intl';
import { Layout } from '../../../../components/Layout';
import { GeneralActions } from '../../containers/GeneralActions';
import { SettingsContainer } from '../../containers/SettingsContainer';
import { SecurityContainer } from '../../containers/SecurityContainer';

export const SettingsPage: NextPage = () => {
  const t = useTranslations('settings');
  return (
    <Layout title={t('title')}>
      <div className="card d-flex">
        <Tabs defaultValue="actions">
          <TabsList>
            <TabsTrigger value="actions">{t('actions.tab-title')}</TabsTrigger>
            <TabsTrigger value="settings">{t('settings.tab-title')}</TabsTrigger>
            <TabsTrigger value="security">{t('security.tab-title')}</TabsTrigger>
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
