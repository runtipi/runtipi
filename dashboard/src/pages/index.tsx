import type { NextPage } from 'next';
import Layout from '../components/Layout';
import api from '../core/api';
import { IUser } from '../core/types';
import Dashboard from '../modules/Dashboard/containers/Dashboard';

const Home: NextPage = () => {
  return (
    <Layout>
      <Dashboard />
    </Layout>
  );
};

export async function getServerSideProps() {
  const token = localStorage.getItem('tipi_token');

  // Fetch data from external API
  const res = await api.fetch<IUser>({
    endpoint: '/user',
    method: 'post',
    data: { token },
  });

  console.log(res);

  // Pass data to the page via props
  return { props: { user: res } };
}

export default Home;
