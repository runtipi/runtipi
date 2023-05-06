import merge from 'lodash.merge';
import { getAuthedPageProps, getMessagesPageProps } from '@/utils/page-helpers';
import { GetServerSideProps } from 'next';

export { AppDetailsPage as default } from '../../client/modules/Apps/pages/AppDetailsPage';

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const authedProps = await getAuthedPageProps(ctx);
  const messagesProps = await getMessagesPageProps(ctx);

  const { id } = ctx.query;
  const appId = String(id);

  return merge(authedProps, messagesProps, {
    props: {
      appId,
    },
  });
};
