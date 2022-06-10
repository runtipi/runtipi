import type { NextPage } from 'next';
import { useEffect } from 'react';
import Layout from '../../components/Layout';
import { useAppsStore } from '../../state/appsStore';
import AppDetails from '../../modules/Apps/containers/AppDetails';

interface IProps {
  appId: string;
}

const AppDetailsPage: NextPage<IProps> = ({ appId }) => {
  const { fetchApp, getApp } = useAppsStore((state) => state);
  const app = getApp(appId);

  useEffect(() => {
    fetchApp(appId);
  }, [appId, fetchApp]);

  const breadcrumb = [
    { name: 'App Store', href: '/app-store' },
    { name: app?.name || '', href: `/app-store/${appId}`, current: true },
  ];

  return (
    <Layout breadcrumbs={breadcrumb} loading={!app}>
      {app && <AppDetails app={app} />}
    </Layout>
  );
};

AppDetailsPage.getInitialProps = async (ctx) => {
  const { query } = ctx;

  const appId = query.id as string;

  return { appId };
};

export default AppDetailsPage;
