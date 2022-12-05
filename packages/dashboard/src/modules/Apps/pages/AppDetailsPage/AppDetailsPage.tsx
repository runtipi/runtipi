import { NextPage } from 'next';
import React from 'react';
import { Layout } from '../../../../components/Layout';
import { ErrorPage } from '../../../../components/ui/ErrorPage';
import { useGetAppQuery } from '../../../../generated/graphql';
import { AppDetailsContainer } from '../../containers/AppDetailsContainer/AppDetailsContainer';

interface IProps {
  appId: string;
}

export const AppDetailsPage: NextPage<IProps> = ({ appId }) => {
  const { data, loading, error } = useGetAppQuery({ variables: { appId }, pollInterval: 3000 });

  const breadcrumb = [
    { name: 'Apps', href: '/apps' },
    { name: data?.getApp.info?.name || '', href: `/apps/${appId}`, current: true },
  ];

  return (
    <Layout breadcrumbs={breadcrumb} loading={!data?.getApp && loading} title={data?.getApp.info?.name}>
      {data?.getApp.info && <AppDetailsContainer app={data?.getApp} info={data.getApp.info} />}
      {error && <ErrorPage error={error.message} />}
    </Layout>
  );
};

AppDetailsPage.getInitialProps = (ctx) => {
  const { query } = ctx;

  const appId = String(query.id);

  return { appId };
};
