import React from 'react';
import type { NextPage } from 'next';
import { SettingsContainer } from '../../containers/SettingsContainer/SettingsContainer';
import { trpc } from '../../../../utils/trpc';

export const SettingsPage: NextPage = () => {
  const { data, isLoading, error } = trpc.system.getVersion.useQuery(undefined, { staleTime: 0 });

  return <SettingsContainer data={data} loading={isLoading} error={error?.message} />;
};
