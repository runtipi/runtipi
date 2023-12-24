import { AppServiceClass } from '@/server/services/apps/apps.service';
import { db } from '@/server/db';
import React from 'react';
import { Metadata } from 'next';
import { getTranslatorFromCookie } from '@/lib/get-translator';
import { AppTile } from '@/components/AppTile';
import Link from 'next/link';
import clsx from 'clsx';
import { UpdateAllButtonWrapper } from 'src/app/(dashboard)/apps/components/UpdateAllButton/UpdateAllButtonWrapper';
import { EmptyPage } from '../../components/EmptyPage';
import styles from './page.module.css';

export async function generateMetadata(): Promise<Metadata> {
  const translator = await getTranslatorFromCookie();

  return {
    title: `${translator('apps.my-apps.title')} - Tipi`,
  };
}

export default async function Page() {
  const appsService = new AppServiceClass(db);
  const installedApps = await appsService.installedApps();
  const aviableUpdates = installedApps.filter(app => Number(app.version) < Number(app.latestVersion));

  const renderApp = (app: (typeof installedApps)[number]) => {
    const updateAvailable = Number(app.version) < Number(app.latestVersion);

    if (app.info?.available)
      return (
        <Link key={app.id} href={`/apps/${app.id}`} className={clsx('col-sm-6 col-lg-4', styles.link)} passHref>
          <AppTile key={app.id} app={app.info} status={app.status} updateAvailable={updateAvailable} />
        </Link>
      );

    return null;
  };

  return (
    <>
      { aviableUpdates.length >= 0 && <UpdateAllButtonWrapper /> }
        
      {installedApps.length === 0 && <EmptyPage title="apps.my-apps.empty-title" subtitle="apps.my-apps.empty-subtitle" redirectPath="/app-store" actionLabel="apps.my-apps.empty-action" />}
      <div className="row row-cards " data-testid="apps-list">
        {installedApps?.map(renderApp)}
      </div>
    </>
  );
}
