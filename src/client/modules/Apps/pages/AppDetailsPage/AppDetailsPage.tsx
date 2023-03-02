import { NextPage } from 'next';
import React from 'react';
import { Layout } from '../../../../components/Layout';
import { ErrorPage } from '../../../../components/ui/ErrorPage';
import { trpc } from '../../../../utils/trpc';
import { AppDetailsContainer } from '../../containers/AppDetailsContainer/AppDetailsContainer';

interface IProps {
  appId: string;
}

export const AppDetailsPage: NextPage<IProps> = ({ appId }) => {
  const { data, error } = trpc.app.getApp.useQuery({ id: appId }, { refetchInterval: 3000 });

  const breadcrumb = [
    { name: 'Apps', href: '/apps' },
    { name: data?.info?.name || '', href: `/apps/${data?.id}`, current: true },
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
