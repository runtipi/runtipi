import React from 'react';
import type { NextPage } from 'next';
import Layout from '../../components/Layout';
import AppStoreContainer from '../../modules/AppStore/containers/AppStoreContainer';
import { useListAppsQuery } from '../../generated/graphql';

const Apps: NextPage = () => {
  const { loading, data } = useListAppsQuery();

  return (
    <Layout loading={loading && !data}>
      <AppStoreContainer apps={data?.listAppsInfo.apps || []} />
    </Layout>
  );
};

export default Apps;
