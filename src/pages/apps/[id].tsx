import { Context } from '@/server/context';
import { getAuthedPageProps } from '@/utils/page-helpers';
import { GetServerSidePropsContext } from 'next';

export { AppDetailsPage as default } from '../../client/modules/Apps/pages/AppDetailsPage';

export const getServerSideProps = async (ctx: Context & GetServerSidePropsContext) => {
  const authedProps = await getAuthedPageProps(ctx);

  const { id } = ctx.query;
  const appId = String(id);

  return {
    ...authedProps,
    props: { appId },
  };
};
