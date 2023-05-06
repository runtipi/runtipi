import { getAuthedPageProps, getMessagesPageProps } from '@/utils/page-helpers';
import merge from 'lodash.merge';
import { GetServerSideProps } from 'next';

export { AppsPage as default } from '../../client/modules/Apps/pages/AppsPage';

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const authedProps = await getAuthedPageProps(ctx);
  const messagesProps = await getMessagesPageProps(ctx);

  return merge(authedProps, messagesProps, {
    props: {},
  });
};
