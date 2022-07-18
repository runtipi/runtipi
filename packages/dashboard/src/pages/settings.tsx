import type { NextPage } from 'next';
import { Text } from '@chakra-ui/react';
import Layout from '../components/Layout';
import { useVersionQuery } from '../generated/graphql';

const Settings: NextPage = () => {
  const { data, loading } = useVersionQuery();

  const isLatest = data?.version.latest === data?.version.current;

  const renderUpdate = () => {
    if (isLatest) {
      return (
        <Text fontSize="md" color="green.500">
          Your Tipi install is up to date. Version {data?.version.current}
        </Text>
      );
    }

    return (
      <Text fontSize="md">
        You are not using the latest version of Tipi. There is a new version ({data?.version.latest}) available. Visit{' '}
        <a className="text-blue-600" target="_blank" rel="noreferrer" href={`https://github.com/meienberger/runtipi/releases/v${data?.version.latest}`}>
          Github
        </a>{' '}
        for update instructions.
      </Text>
    );
  };

  return (
    <Layout loading={!data?.version && loading}>
      <Text fontSize="3xl" className="font-bold">
        Settings
      </Text>
      {renderUpdate()}
    </Layout>
  );
};

export default Settings;
