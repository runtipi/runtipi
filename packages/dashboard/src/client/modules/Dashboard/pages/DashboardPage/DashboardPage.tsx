import React from 'react';
import type { NextPage } from 'next';
import { DashboardContainer } from '../../containers/DashboardContainer';
import { trpc } from '../../../../utils/trpc';

export const DashboardPage: NextPage = () => {
  const { data, isLoading, error } = trpc.system.systemInfo.useQuery();

  return <DashboardContainer data={data} loading={isLoading} error={error?.message} />;
};
