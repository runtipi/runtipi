import React from 'react';
import type { NextPage } from 'next';
import { useTranslations } from 'next-intl';
import type { MessageKey } from '@/server/utils/errors';
import { DashboardContainer } from '../../containers/DashboardContainer';
import { trpc } from '../../../../utils/trpc';
import { Layout } from '../../../../components/Layout';
import { ErrorPage } from '../../../../components/ui/ErrorPage';

export const DashboardPage: NextPage = () => {
  const t = useTranslations();
  const { data, error } = trpc.system.systemInfo.useQuery();

  return (
    <Layout title={t('dashboard.title')}>
      {data && <DashboardContainer data={data} />}
      {error && <ErrorPage error={t(error.data?.tError.message as MessageKey, { ...error.data?.tError.variables })} />}
    </Layout>
  );
};
