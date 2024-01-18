import { AppServiceClass } from '@/server/services/apps/apps.service';
import { db } from '@/server/db';
import React from 'react';
import { Metadata } from 'next';
import { getTranslatorFromCookie } from '@/lib/get-translator';
import { AppTile } from '@/components/AppTile';
import Link from 'next/link';
import clsx from 'clsx';
import { EmptyPage } from '../../components/EmptyPage';
import styles from './page.module.css';

export async function generateMetadata(): Promise<Metadata> {
  const translator = await getTranslatorFromCookie();

  return {
    title: `${translator('MY_APPS_TITLE')} - Tipi`,
  };
}

export default async function Page() {
  const appsService = new AppServiceClass(db);
  const installedApps = await appsService.installedApps();

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
      {installedApps.length === 0 && (
        <EmptyPage title="MY_APPS_EMPTY_TITLE" subtitle="MY_APPS_EMPTY_SUBTITLE" redirectPath="/app-store" actionLabel="MY_APPS_EMPTY_ACTION" />
      )}
      <div className="row row-cards " data-testid="apps-list">
        {installedApps?.map(renderApp)}
      </div>
    </>
  );
}
