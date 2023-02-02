import React from 'react';
import { useRouter } from 'next/router';
import { NextPage } from 'next';
import { AppTile } from '../../../../components/AppTile';
import { Layout } from '../../../../components/Layout';
import { EmptyPage } from '../../../../components/ui/EmptyPage';
import { ErrorPage } from '../../../../components/ui/ErrorPage';
import { trpc } from '../../../../utils/trpc';
import { AppRouterOutput } from '../../../../../server/routers/app/app.router';

export const AppsPage: NextPage = () => {
  const { data, isLoading, error } = trpc.app.installedApps.useQuery();

  const renderApp = (app: AppRouterOutput['installedApps'][number]) => {
    const updateAvailable = Number(app.version) < Number(app.info.tipi_version);

    if (app.info?.available) return <AppTile key={app.id} app={app.info} status={app.status} updateAvailable={updateAvailable} />;

    return null;
  };

  const router = useRouter();

  return (
    <Layout title="My Apps">
      <div>
        {Boolean(data?.length) && (
          <div className="row row-cards" data-testid="apps-list">
            {data?.map(renderApp)}
          </div>
        )}
        {!isLoading && data?.length === 0 && (
          <EmptyPage title="No app installed" subtitle="Install an app from the app store to get started" onAction={() => router.push('/app-store')} actionLabel="Go to app store" />
        )}
        {error && <ErrorPage error={error.message} />}
      </div>
    </Layout>
  );
};
