import { GetServerSideProps } from 'next';
import merge from 'lodash.merge';
import { getLocaleFromString } from '@/shared/internationalization/locales';
import { getCookie } from 'cookies-next';
import { TipiCache } from '@/server/core/TipiCache';

export const getAuthedPageProps: GetServerSideProps = async (ctx) => {
  const cache = new TipiCache();
  const sessionId = ctx.req.headers['x-session-id'];
  const userId = await cache.get(`session:${sessionId}`);
  await cache.close();

  if (!userId) {
    return {
      redirect: {
        destination: '/login',
        permanent: false,
      },
    };
  }

  return {
    props: {},
  };
};

export const getMessagesPageProps: GetServerSideProps = async (ctx) => {
  const cookieLocale = getCookie('tipi-locale', { req: ctx.req });
  const browserLocale = ctx.req.headers['accept-language']?.split(',')[0];

  const locale = getLocaleFromString(String(cookieLocale || browserLocale || 'en'));

  const englishMessages = (await import(`../messages/en.json`)).default;
  const messages = (await import(`../messages/${locale}.json`)).default;
  const mergedMessages = merge(englishMessages, messages);

  return {
    props: {
      messages: mergedMessages,
    },
  };
};
