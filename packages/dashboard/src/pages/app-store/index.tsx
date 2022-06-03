import React, { useEffect } from 'react';
import type { NextPage } from 'next';
import Layout from '../../components/Layout';
import AppStoreContainer from '../../modules/AppStore/containers/AppStoreContainer';
import { useAppsStore } from '../../state/appsStore';
import { RequestStatus } from '../../core/types';

const Apps: NextPage = () => {
  const { fetch, status } = useAppsStore((state) => state);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return (
    <Layout loading={status === RequestStatus.LOADING}>
      <AppStoreContainer />
    </Layout>
  );
};

export default Apps;
