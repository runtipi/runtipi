import type { NextPage } from 'next';
import Layout from '../components/Layout';
import { useSystemInfoQuery } from '../generated/graphql';
import Dashboard from '../modules/Dashboard/containers/Dashboard';

const Home: NextPage = () => {
  const { data, loading } = useSystemInfoQuery({ pollInterval: 10000 });
  return <Layout loading={loading && !data}>{data?.systemInfo && <Dashboard data={data.systemInfo} />}</Layout>;
};

export default Home;
