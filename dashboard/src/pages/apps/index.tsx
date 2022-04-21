import React, { useEffect } from 'react';
import { Flex, SimpleGrid } from '@chakra-ui/react';
import type { NextPage } from 'next';
import Layout from '../../components/Layout';
import { RequestStatus } from '../../core/types';
import { useAppsStore } from '../../state/appsStore';
import AppTile from '../../components/AppTile';

const Apps: NextPage = () => {
  const { available, installed, fetch, status } = useAppsStore((state) => state);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const installedCount: number = installed().length || 0;
  const loading = status === RequestStatus.LOADING && !installed && !available;

  return (
    <Layout loading={loading}>
      <Flex className="flex-col">
        {installedCount > 0 && <h1 className="font-bold text-2xl mb-3">Your Apps ({installedCount})</h1>}
        <SimpleGrid minChildWidth="400px" spacing="20px">
          {installed().map((app) => (
            <AppTile key={app.name} app={app} />
          ))}
        </SimpleGrid>
        {available().length && <h1 className="font-bold text-2xl mb-3 mt-3">Available Apps</h1>}
        <SimpleGrid minChildWidth="400px" spacing="20px">
          {available().map((app) => (
            <AppTile key={app.name} app={app} />
          ))}
        </SimpleGrid>
      </Flex>
    </Layout>
  );
};

export default Apps;
