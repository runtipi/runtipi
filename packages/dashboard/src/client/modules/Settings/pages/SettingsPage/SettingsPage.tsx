import React from 'react';
import type { NextPage } from 'next';
import { SettingsContainer } from '../../containers/SettingsContainer/SettingsContainer';
import { trpc } from '../../../../utils/trpc';
import { Layout } from '../../../../components/Layout';
import { ErrorPage } from '../../../../components/ui/ErrorPage';

export const SettingsPage: NextPage = () => {
  const { data, error } = trpc.system.getVersion.useQuery(undefined, { staleTime: 0 });

  // TODO: add loading state
  return (
    <Layout title="Settings">
      {data && <SettingsContainer data={data} />}
      {error && <ErrorPage error={error.message} />}
    </Layout>
  );
};
