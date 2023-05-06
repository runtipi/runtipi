import { getMessagesPageProps } from '@/utils/page-helpers';
import merge from 'lodash.merge';
import { GetServerSideProps } from 'next';

export { RegisterPage as default } from '../client/modules/Auth/pages/RegisterPage';

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const messagesProps = await getMessagesPageProps(ctx);

  return merge(messagesProps, {
    props: {},
  });
};
