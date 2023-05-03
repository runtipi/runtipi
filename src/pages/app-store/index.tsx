import { getAuthedPageProps } from '@/utils/page-helpers';
import { GetServerSideProps } from 'next';

export { AppStorePage as default } from '../../client/modules/AppStore/pages/AppStorePage';

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const authedProps = await getAuthedPageProps(ctx);

  return {
    ...authedProps,
    props: {},
  };
};
