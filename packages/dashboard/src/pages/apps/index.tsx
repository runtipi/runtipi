import React, { useEffect } from 'react';
import { Flex, SimpleGrid } from '@chakra-ui/react';
import type { NextPage } from 'next';
import Layout from '../../components/Layout';
import { RequestStatus } from '../../core/types';
import { useAppsStore } from '../../state/appsStore';
import AppTile from '../../components/AppTile';

const Apps: NextPage = () => {
  const { fetch, status, apps } = useAppsStore((state) => state);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const installed = apps.filter((app) => app.installed);

  const installedCount: number = installed.length || 0;
  const loading = status === RequestStatus.LOADING && installedCount === 0;

  return (
    <Layout loading={loading}>
      <Flex className="flex-col">
        {installedCount > 0 && <h1 className="font-bold text-3xl mb-5">My Apps ({installedCount})</h1>}
        {installedCount === 0 && (
          <div>
            <h1 className="font-bold text-3xl mb-5">No apps installed</h1>
            <h2>Visit the App Store to install your first app</h2>
          </div>
        )}
        <SimpleGrid minChildWidth="375px" spacing="20px">
          {installed.map((app) => (
            <AppTile key={app.name} app={app} />
          ))}
        </SimpleGrid>
      </Flex>
    </Layout>
  );
};

export default Apps;
