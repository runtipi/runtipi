import { Tabs, TabsContent } from '@/components/ui/tabs';
import { getTranslator } from '@/lib/get-translator';
import { Metadata } from 'next';
import React from 'react';
import { SystemServiceClass } from '@/server/services/system';
import { TipiConfig } from '@/server/core/TipiConfig';
import { getCurrentLocale } from 'src/utils/getCurrentLocale';
import { getUserFromCookie } from '@/server/common/session.helpers';
import { SettingsTabTriggers } from './components/SettingsTabTriggers';
import { GeneralActions } from './components/GeneralActions';
import { SettingsContainer } from './components/SettingsContainer';
import { SecurityContainer } from './components/SecurityContainer';
import { LogsContainer } from './components/LogsContainer';

export async function generateMetadata(): Promise<Metadata> {
  const translator = await getTranslator();

  return {
    title: `${translator('SETTINGS_TITLE')} - Tipi`,
  };
}

export default async function SettingsPage({ searchParams }: { searchParams: { tab: string } }) {
  const { tab } = searchParams;
  const systemService = new SystemServiceClass();
  const version = await systemService.getVersion();
  const settings = TipiConfig.getSettings();
  const locale = getCurrentLocale();
  const user = await getUserFromCookie();

  return (
    <div className="card d-flex">
      <Tabs defaultValue={tab || 'actions'}>
        <SettingsTabTriggers />
        <TabsContent value="actions">
          <GeneralActions version={version} />
        </TabsContent>
        <TabsContent value="settings">
          <SettingsContainer initialValues={settings} currentLocale={locale} />
        </TabsContent>
        <TabsContent value="security">
          <SecurityContainer totpEnabled={Boolean(user?.totpEnabled)} username={user?.username} />
        </TabsContent>
        <TabsContent value="logs">
          <LogsContainer />
        </TabsContent>
      </Tabs>
    </div>
  );
}
