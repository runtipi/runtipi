import { AppServiceClass } from '@/server/services/apps/apps.service';
import { CustomLinksServiceClass } from '@/server/services/custom-links/custom-links.service';
import { db } from '@/server/db';
import React from 'react';
import { Metadata } from 'next';
import { getUserFromCookie } from '@/server/common/session.helpers';
import { getTranslatorFromCookie } from '@/lib/get-translator';
import { AppTile } from '@/components/AppTile';
import Link from 'next/link';
import { Link as CustomLink } from '@/server/db/schema';
import clsx from 'clsx';
import { LinkTile } from '@/components/LinkTile/LinkTile';
import { EmptyPage } from '../../components/EmptyPage';
import styles from './page.module.css';
import { AddLinkBtn } from '../components/AddLink/AddLinkBtn';

export async function generateMetadata(): Promise<Metadata> {
  const translator = await getTranslatorFromCookie();

  return {
    title: `${translator('apps.my-apps.title')} - Tipi`,
  };
}

export default async function Page() {
  const appsService = new AppServiceClass(db);
  const installedApps = await appsService.installedApps();

  const user = await getUserFromCookie();
  const linksService = new CustomLinksServiceClass(db);
  const customLinks = await linksService.getLinks(user?.id);

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

  const renderLink = (link: CustomLink) => {
    return (
      <Link key={link.id} href={link.url} target="_blank" className={clsx('col-sm-6 col-lg-4', styles.link)} passHref>
        <LinkTile key={link.id} link={link} />
      </Link>
    );
  }

  return (
    <>
      {installedApps.length === 0 && <EmptyPage title="apps.my-apps.empty-title" subtitle="apps.my-apps.empty-subtitle" redirectPath="/app-store" actionLabel="apps.my-apps.empty-action" />}
      <div className="row row-cards " data-testid="apps-list">
        {installedApps?.map(renderApp)}
        {customLinks?.map(renderLink)}
        <AddLinkBtn />
      </div>
    </>
  );
}
