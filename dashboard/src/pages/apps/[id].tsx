import type { NextPage } from 'next';
import { useEffect } from 'react';
import Layout from '../../components/Layout';
import { useAppsStore } from '../../state/appsStore';
import AppDetails from '../../modules/Apps/containers/AppDetails';

interface Props {
  appId: string;
}

const AppDetailsPage: NextPage<Props> = ({ appId }) => {
  const { getApp, fetchApp } = useAppsStore((state) => state);

  const app = getApp(appId);

  useEffect(() => {
    fetchApp(appId);
  }, [appId, fetchApp]);

  const breadcrumb = [
    { name: 'Apps', href: '/apps' },
    { name: app?.name || '', href: `/apps/${appId}`, current: true },
  ];

  return (
    <Layout breadcrumbs={breadcrumb} loading={!app}>
      {app && <AppDetails app={app} />}
    </Layout>
  );
};

AppDetailsPage.getInitialProps = async ({ query, pathname }) => {
  const appId = (query.id as string) || pathname.split('/')[1];

  return { appId };
};

export default AppDetailsPage;
