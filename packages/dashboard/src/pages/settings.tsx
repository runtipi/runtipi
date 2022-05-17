import type { NextPage } from 'next';
import { Text } from '@chakra-ui/react';
import useSWR from 'swr';
import Layout from '../components/Layout';
import fetcher from '../core/fetcher';

const Settings: NextPage = () => {
  const { data } = useSWR<{ current: string; latest: string }>('/system/version', fetcher);

  const isLatest = data?.latest === data?.current;

  const renderUpdate = () => {
    if (isLatest) {
      return (
        <Text fontSize="md" color="green.500">
          Your Tipi install is up to date. Version {data?.current}
        </Text>
      );
    }

    return (
      <Text fontSize="md">
        You are not using the latest version of Tipi. There is a new version ({data?.latest}) available. Visit{' '}
        <a className="text-blue-600" target="_blank" rel="noreferrer" href={`https://github.com/meienberger/runtipi/releases/v${data?.latest}`}>
          Github
        </a>{' '}
        for update instructions.
      </Text>
    );
  };

  return (
    <Layout loading={!data}>
      <Text fontSize="3xl" className="font-bold">
        Settings
      </Text>
      {renderUpdate()}
    </Layout>
  );
};

export default Settings;
