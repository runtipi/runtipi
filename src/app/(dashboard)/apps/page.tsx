import type { Metadata } from 'next';
import { getTranslator } from '@/lib/get-translator';
import { AppTile } from '@/components/AppTile';
import Link from 'next/link';
import type { Link as CustomLink } from '@runtipi/db';
import clsx from 'clsx';
import { LinkTile } from '@/components/LinkTile/LinkTile';
import { EmptyPage } from '../../components/EmptyPage';
import styles from './page.module.css';
import { AddLinkButton } from '../components/AddLink/AddLinkButton';
import { appCatalog } from '@/server/services/app-catalog/app-catalog.service';
import { getClass } from 'src/inversify.config';

export async function generateMetadata(): Promise<Metadata> {
  const translator = await getTranslator();

  return {
    title: `${translator('MY_APPS_TITLE')} - Tipi`,
  };
}

export default async function Page() {
  const installedApps = await appCatalog.executeCommand('getInstalledApps');

  const sessionManager = getClass('ISessionManager');
  const user = await sessionManager.getUserFromCookie();

  const linksService = getClass('ICustomLinksService');
  const customLinks = await linksService.getLinks(user?.id);

  const renderApp = (app: (typeof installedApps)[number]) => {
    const updateAvailable = Number(app.version) < Number(app.latestVersion);

    if (app.info?.available)
      return (
        <Link key={app.id} href={`/apps/${app.id}`} className={clsx('col-sm-6 col-lg-4', styles.link)} passHref>
          <AppTile key={app.id} app={app.info} updateAvailable={updateAvailable} />
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
  };

  return (
    <>
      {installedApps.length === 0 && customLinks.length === 0 && (
        <EmptyPage title="MY_APPS_EMPTY_TITLE" subtitle="MY_APPS_EMPTY_SUBTITLE" redirectPath="/app-store" actionLabel="MY_APPS_EMPTY_ACTION" />
      )}
      <div className="row row-cards " data-testid="apps-list">
        {installedApps?.map(renderApp)}
        {customLinks?.map(renderLink)}
        {installedApps.length > 0 ? <AddLinkButton /> : null}
      </div>
    </>
  );
}
