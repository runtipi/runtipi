import React from 'react';
import type { NextPage } from 'next';
import { Layout } from '../../../../components/Layout';
import Dashboard from '../../containers/Dashboard';
import { useSystemInfoQuery } from '../../../../generated/graphql';

export const DashboardPage: NextPage = () => {
  const { data, loading } = useSystemInfoQuery({ pollInterval: 10000 });
  return (
    <Layout title="Dashboard" loading={loading && !data}>
      {data?.systemInfo && <Dashboard data={data.systemInfo} />}
    </Layout>
  );
};
