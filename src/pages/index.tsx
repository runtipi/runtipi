import { getAuthedPageProps } from '@/utils/page-helpers';
import { GetServerSideProps } from 'next';

export { DashboardPage as default } from '../client/modules/Dashboard/pages/DashboardPage';

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const authedProps = await getAuthedPageProps(ctx);

  return {
    ...authedProps,
    props: {},
  };
};
