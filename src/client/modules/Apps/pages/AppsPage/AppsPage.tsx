import React from 'react';
import { useRouter } from 'next/router';
import { NextPage } from 'next';
import { useTranslations } from 'next-intl';
import type { MessageKey } from '@/server/utils/errors';
import { AppTile } from '../../../../components/AppTile';
import { Layout } from '../../../../components/Layout';
import { EmptyPage } from '../../../../components/ui/EmptyPage';
import { ErrorPage } from '../../../../components/ui/ErrorPage';
import { trpc } from '../../../../utils/trpc';
import { AppRouterOutput } from '../../../../../server/routers/app/app.router';

export const AppsPage: NextPage = () => {
  const t = useTranslations();
  const { data, isLoading, error } = trpc.app.installedApps.useQuery();

  const renderApp = (app: AppRouterOutput['installedApps'][number]) => {
    const updateAvailable = Number(app.version) < Number(app.latestVersion);

    if (app.info?.available) return <AppTile key={app.id} app={app.info} status={app.status} updateAvailable={updateAvailable} />;

    return null;
  };

  const router = useRouter();

  return (
    <Layout title={t('apps.my-apps.title')}>
      <div>
        {Boolean(data?.length) && (
          <div className="row row-cards" data-testid="apps-list">
            {data?.map(renderApp)}
          </div>
        )}
        {!isLoading && data?.length === 0 && (
          <EmptyPage title={t('apps.my-apps.empty-title')} subtitle={t('apps.my-apps.empty-subtitle')} onAction={() => router.push('/app-store')} actionLabel={t('apps.my-apps.empty-action')} />
        )}
        {error && <ErrorPage error={t(error.data?.tError.message as MessageKey, { ...error.data?.tError?.variables })} />}
      </div>
    </Layout>
  );
};
