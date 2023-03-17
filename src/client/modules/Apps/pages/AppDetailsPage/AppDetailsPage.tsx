import { NextPage } from 'next';
import React from 'react';
import { Layout } from '../../../../components/Layout';
import { ErrorPage } from '../../../../components/ui/ErrorPage';
import { trpc } from '../../../../utils/trpc';
import { AppDetailsContainer } from '../../containers/AppDetailsContainer/AppDetailsContainer';

interface IProps {
  appId: string;
  refSlug: string;
  refTitle: string;
}

export const AppDetailsPage: NextPage<IProps> = ({ appId, refSlug, refTitle }) => {
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
