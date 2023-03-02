import React from 'react';
import type { NextPage } from 'next';
import { DashboardContainer } from '../../containers/DashboardContainer';
import { trpc } from '../../../../utils/trpc';
import { Layout } from '../../../../components/Layout';
import { ErrorPage } from '../../../../components/ui/ErrorPage';

export const DashboardPage: NextPage = () => {
  const { data, error } = trpc.system.systemInfo.useQuery();

  return (
    <Layout title="Dashboard">
      {data && <DashboardContainer data={data} />}
      {error && <ErrorPage error={error.message} />}
    </Layout>
  );
};
