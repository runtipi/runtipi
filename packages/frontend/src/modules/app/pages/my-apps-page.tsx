import { Link, Navigate, useParams } from 'react-router';
import './page.css';
import { getInstalledAppsOptions, getLinksOptions } from '@/api-client/@tanstack/react-query.gen';
import { EmptyPage } from '@/components/empty-page/empty-page';
import type { CustomLink } from '@/types/app.types';
import { useSuspenseQuery } from '@tanstack/react-query';
import { AddLinkButton } from '../components/add-link-tile/add-link-tile';
import { AppTile } from '../components/app-tile/app-tile';
import { LinkTile } from '../components/link-tile/link-tile';

export const MyAppsPage = () => {
  const params = useParams<{ storeId: string }>();

  const { data: apps } = useSuspenseQuery({
    ...getInstalledAppsOptions(),
  });

  const { data: links } = useSuspenseQuery({
    ...getLinksOptions(),
  });

  const { installed } = apps;
  const { links: customLinks = [] } = links;

  const renderApp = ({ info, app, updateInfo }: (typeof installed)[number]) => {
    const updateAvailable = Number(app.version) < Number(updateInfo.latestVersion);

    const [appId, storeId] = app.id.split('_');

    if (info.available)
      return (
        <Link key={app.id} to={`/apps/${storeId}/${appId}`} className="col-sm-6 col-lg-4 my-apps-link">
          <AppTile key={app.id} status={app.status} info={info} updateAvailable={updateAvailable} />
        </Link>
      );

    return null;
  };

  const renderLink = (link: CustomLink) => {
    return (
      <Link key={link.id} to={link.url} target="_blank" className="col-sm-6 col-lg-4 my-apps-link">
        <LinkTile key={link.id} link={link} />
      </Link>
    );
  };

  if (params.storeId) {
    return <Navigate to="/apps" />;
  }

  return (
    <>
      {installed.length === 0 && customLinks.length === 0 && (
        <EmptyPage title="MY_APPS_EMPTY_TITLE" subtitle="MY_APPS_EMPTY_SUBTITLE" redirectPath="/app-store" actionLabel="MY_APPS_EMPTY_ACTION" />
      )}
      <div className="row row-cards " data-testid="apps-list">
        {installed.map(renderApp)}
        {customLinks.map(renderLink)}
        {installed.length > 0 ? <AddLinkButton /> : null}
      </div>
    </>
  );
};
