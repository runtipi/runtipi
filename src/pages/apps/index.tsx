import { getAuthedPageProps } from '@/utils/page-helpers';
import { GetServerSideProps } from 'next';

export { AppsPage as default } from '../../client/modules/Apps/pages/AppsPage';

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const authedProps = await getAuthedPageProps(ctx);

  return {
    ...authedProps,
    props: {},
  };
};
