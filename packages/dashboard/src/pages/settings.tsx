import type { NextPage } from 'next';
import { Text } from '@chakra-ui/react';
import useSWR from 'swr';
import Layout from '../components/Layout';
import fetcher from '../core/fetcher';
import Package from '../../package.json';

const Settings: NextPage = () => {
  const { data: latestVersion } = useSWR<string>('/system/version/latest', fetcher);

  const isLatest = latestVersion === `v${Package.version}`;

  const renderUpdate = () => {
    if (isLatest) {
      return (
        <Text fontSize="md" color="green.500">
          Your Tipi install is up to date. Version {Package.version}
        </Text>
      );
    }

    return (
      <Text fontSize="md">
        You are not using the latest version of Tipi. There is a new version ({latestVersion}) available. Visit{' '}
        <a className="text-blue-600" target="_blank" rel="noreferrer" href={`https://github.com/meienberger/runtipi/releases/${latestVersion}`}>
          Github
        </a>{' '}
        for update instructions.
      </Text>
    );
  };

  return (
    <Layout loading={!latestVersion}>
      <Text fontSize="3xl" className="font-bold">
        Settings
      </Text>
      {renderUpdate()}
    </Layout>
  );
};

export default Settings;
