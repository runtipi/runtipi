import { NextPageContext } from 'next';
import nookies from 'nookies';

export { DashboardPage as default } from '../client/modules/Dashboard/pages/DashboardPage';

/**
 * Get server side props
 *
 * @param {NextPageContext} ctx - Next.js context
 */
export async function getServerSideProps(ctx: NextPageContext) {
  const { locale } = nookies.get(ctx);

  return {
    props: {
      messages: (await import(`../client/messages/${locale}.json`)).default,
    },
  };
}
