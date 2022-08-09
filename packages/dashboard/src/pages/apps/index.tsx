import React from 'react';
import { Flex, SimpleGrid } from '@chakra-ui/react';
import type { NextPage } from 'next';
import Layout from '../../components/Layout';
import AppTile from '../../components/AppTile';
import { InstalledAppsQuery, useInstalledAppsQuery } from '../../generated/graphql';

const Apps: NextPage = () => {
  const { data, loading } = useInstalledAppsQuery();

  const installedCount: number = data?.installedApps.length || 0;

  const renderApp = (app: InstalledAppsQuery['installedApps'][0]) => {
    const updateAvailable = Number(app.updateInfo?.current) < Number(app.updateInfo?.latest);

    if (app.info) return <AppTile key={app.id} app={app.info} status={app.status} updateAvailable={updateAvailable} />;
  };

  return (
    <Layout loading={loading || !data?.installedApps}>
      <Flex className="flex-col">
        {installedCount > 0 && <h1 className="font-bold text-3xl mb-5">My Apps ({installedCount})</h1>}
        {installedCount === 0 && (
          <div>
            <h1 className="font-bold text-3xl mb-5">No apps installed</h1>
            <h2>Visit the App Store to install your first app</h2>
          </div>
        )}
        <SimpleGrid minChildWidth="340px" spacing="20px">
          {data?.installedApps.map((a) => renderApp(a))}
        </SimpleGrid>
      </Flex>
    </Layout>
  );
};

export default Apps;
