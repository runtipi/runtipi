import { Tabs, TabsContent } from '@/components/ui/tabs';
import { getTranslatorFromCookie } from '@/lib/get-translator';
import { Metadata } from 'next';
import React from 'react';
import { SystemServiceClass } from '@/server/services/system';
import { getSettings } from '@/server/core/TipiConfig';
import { getCurrentLocale } from 'src/utils/getCurrentLocale';
import { SettingsTabTriggers } from './components/SettingsTabTriggers';
import { GeneralActions } from './components/GeneralActions';
import { SettingsContainer } from './components/SettingsContainer';

export async function generateMetadata(): Promise<Metadata> {
  const translator = await getTranslatorFromCookie();

  return {
    title: `${translator('settings.title')} - Tipi`,
  };
}

export default async function SettingsPage({ searchParams }: { searchParams: { tab: string } }) {
  const { tab } = searchParams;
  const systemService = new SystemServiceClass();
  const version = await systemService.getVersion();
  const settings = getSettings();
  const locale = getCurrentLocale();

  return (
    <div className="card d-flex">
      <Tabs defaultValue={(tab as string) || 'actions'}>
        <SettingsTabTriggers />
        <TabsContent value="actions">
          <GeneralActions version={version} />
        </TabsContent>
        <TabsContent value="settings">
          <SettingsContainer initialValues={settings} currentLocale={locale} />
        </TabsContent>
        <TabsContent value="security">{/* <SecurityContainer /> */}</TabsContent>
      </Tabs>
    </div>
  );
}
