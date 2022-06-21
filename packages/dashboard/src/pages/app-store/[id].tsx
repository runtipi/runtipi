import type { NextPage } from 'next';
import Layout from '../../components/Layout';
import AppDetails from '../../modules/Apps/containers/AppDetails';
import { useGetAppQuery } from '../../generated/graphql';

interface IProps {
  appId: string;
}

const AppDetailsPage: NextPage<IProps> = ({ appId }) => {
  const { data, loading } = useGetAppQuery({ variables: { appId }, pollInterval: 5000 });

  const breadcrumb = [
    { name: 'App Store', href: '/app-store' },
    { name: data?.getApp.info?.name || '', href: `/app-store/${appId}`, current: true },
  ];

  return (
    <Layout breadcrumbs={breadcrumb} loading={!data?.getApp && loading}>
      {data?.getApp.info && <AppDetails status={data?.getApp.app?.status} info={data?.getApp.info} />}
    </Layout>
  );
};

AppDetailsPage.getInitialProps = async (ctx) => {
  const { query } = ctx;

  const appId = query.id as string;

  return { appId };
};

export default AppDetailsPage;
