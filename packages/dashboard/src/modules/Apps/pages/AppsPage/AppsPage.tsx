import React from 'react';
import { useRouter } from 'next/router';
import { NextPage } from 'next';
import { AppTile } from '../../../../components/AppTile';
import { InstalledAppsQuery, useInstalledAppsQuery } from '../../../../generated/graphql';
import { Layout } from '../../../../components/Layout';
import { EmptyPage } from '../../../../components/ui/EmptyPage';

export const AppsPage: NextPage = () => {
  const { data, loading } = useInstalledAppsQuery({ pollInterval: 1000 });

  const renderApp = (app: InstalledAppsQuery['installedApps'][0]) => {
    const updateAvailable = Number(app.updateInfo?.current) < Number(app.updateInfo?.latest);

    if (app.info) return <AppTile key={app.id} app={app.info} status={app.status} updateAvailable={updateAvailable} />;

    return null;
  };

  const router = useRouter();

  return (
    <Layout loading={loading || !data?.installedApps} title="My Apps">
      <div>
        {Boolean(data?.installedApps.length) && <div className="row row-cards">{data?.installedApps.map(renderApp)}</div>}
        {data?.installedApps.length === 0 && (
          <EmptyPage title="No app installed" subtitle="Install an app from the app store to get started" onAction={() => router.push('/app-store')} actionLabel="Go to app store" />
        )}
      </div>
    </Layout>
  );
};
