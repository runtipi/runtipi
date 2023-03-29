import { NextPage } from 'next';
import React from 'react';
import { useRouter } from 'next/router';
import { Layout } from '../../../../components/Layout';
import { ErrorPage } from '../../../../components/ui/ErrorPage';
import { trpc } from '../../../../utils/trpc';
import { AppDetailsContainer } from '../../containers/AppDetailsContainer/AppDetailsContainer';

interface IProps {
  appId: string;
}

type Path = { refSlug: string; refTitle: string };
const paths: Record<string, Path> = {
  'app-store': { refSlug: 'app-store', refTitle: 'App Store' },
  apps: { refSlug: 'apps', refTitle: 'Apps' },
};

export const AppDetailsPage: NextPage<IProps> = ({ appId }) => {
  const router = useRouter();

  const basePath = router.pathname.split('/').slice(1)[0];
  const { refSlug, refTitle } = paths[basePath || 'apps'] || { refSlug: 'apps', refTitle: 'Apps' };

  const { data, error } = trpc.app.getApp.useQuery({ id: appId });

  const breadcrumb = [
    { name: refTitle, href: `/${refSlug}` },
    { name: data?.info?.name || '', href: `/${refSlug}/${data?.id}`, current: true },
  ];

  // TODO: add loading state
  return (
    <Layout title={data?.info.name} breadcrumbs={breadcrumb}>
      {data?.info && <AppDetailsContainer app={data} />}
      {error && <ErrorPage error={error.message} />}
    </Layout>
  );
};

AppDetailsPage.getInitialProps = (ctx) => {
  const { query } = ctx;

  const appId = String(query.id);

  return { appId };
};
