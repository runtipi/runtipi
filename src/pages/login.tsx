import { NextPageContext } from 'next';
import nookies from 'nookies';

export { LoginPage as default } from '../client/modules/Auth/pages/LoginPage';

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
