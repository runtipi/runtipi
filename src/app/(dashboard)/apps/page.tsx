import { AppServiceClass } from '@/server/services/apps/apps.service';
import { db } from '@/server/db';
import React from 'react';
import { AppRouterOutput } from '@/server/routers/app/app.router';
import { useUIStore } from '@/client/state/uiStore';
import { Metadata } from 'next';
import { AppTile } from './components/AppTile';
import { EmptyPage } from '../../components/EmptyPage';

export async function generateMetadata(): Promise<Metadata> {
  const { translator } = useUIStore.getState();

  return {
    title: `${translator('apps.my-apps.title')} - Tipi`,
  };
}

export default async function Page() {
  const appsService = new AppServiceClass(db);
  const installedApps = await appsService.installedApps();

  const renderApp = (app: AppRouterOutput['installedApps'][number]) => {
    const updateAvailable = Number(app.version) < Number(app.latestVersion);

    if (app.info?.available) return <AppTile key={app.id} app={app.info} status={app.status} updateAvailable={updateAvailable} />;

    return null;
  };

  return (
    <>
      {installedApps.length === 0 && <EmptyPage title="apps.my-apps.empty-title" subtitle="apps.my-apps.empty-subtitle" redirectPath="/app-store" actionLabel="apps.my-apps.empty-action" />}
      <div className="row row-cards " data-testid="apps-list">
        {installedApps?.map(renderApp)}
      </div>
    </>
  );
}
