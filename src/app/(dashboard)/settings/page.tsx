import { Tabs, TabsContent } from '@/components/ui/tabs';
import { getTranslatorFromCookie } from '@/lib/get-translator';
import { Metadata } from 'next';
import React from 'react';
import { SystemServiceClass } from '@/server/services/system';
import { SettingsTabTriggers } from './components/SettingsTabTriggers';
import { GeneralActions } from './components/GeneralActions';

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

  return (
    <div className="card d-flex">
      <Tabs defaultValue={(tab as string) || 'actions'}>
        <SettingsTabTriggers />
        <TabsContent value="actions">
          <GeneralActions version={version} />
        </TabsContent>
        <TabsContent value="settings">{/* <SettingsContainer /> */}</TabsContent>
        <TabsContent value="security">{/* <SecurityContainer /> */}</TabsContent>
      </Tabs>
    </div>
  );
}
