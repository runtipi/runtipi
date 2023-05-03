import { getAuthedPageProps } from '@/utils/page-helpers';
import { GetServerSideProps } from 'next';

export { SettingsPage as default } from '../client/modules/Settings/pages/SettingsPage';

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const authedProps = await getAuthedPageProps(ctx);

  return {
    ...authedProps,
    props: {},
  };
};
