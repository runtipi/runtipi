import React from 'react';
import type { NextPage } from 'next';
import { useVersionQuery } from '../../../../generated/graphql';
import { Layout } from '../../../../components/Layout';
import { SettingsContainer } from '../../containers/SettingsContainer/SettingsContainer';

export const SettingsPage: NextPage = () => {
  const { data, loading } = useVersionQuery();

  return (
    <Layout title="Settings" loading={!data?.version && loading}>
      {data?.version && <SettingsContainer currentVersion={data.version.current} latestVersion={data.version.latest} />}
    </Layout>
  );
};
