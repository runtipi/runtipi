import type { NextPage } from 'next';
import Layout from '../components/Layout';
import Dashboard from '../modules/Dashboard/containers/Dashboard';

const Home: NextPage = () => {
  return (
    <Layout>
      <Dashboard />
    </Layout>
  );
};

export default Home;
