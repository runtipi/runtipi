import { getAuthedPageProps, getMessagesPageProps } from '@/utils/page-helpers';
import merge from 'lodash.merge';
import { GetServerSideProps } from 'next';

export { AppStorePage as default } from '../../client/modules/AppStore/pages/AppStorePage';

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const authedProps = await getAuthedPageProps(ctx);
  const messagesProps = await getMessagesPageProps(ctx);

  return merge(authedProps, messagesProps, {
    props: {},
  });
};
