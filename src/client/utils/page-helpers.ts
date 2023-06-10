import { GetServerSideProps } from 'next';
import merge from 'lodash.merge';
import { getLocaleFromString } from '@/shared/internationalization/locales';
import { getCookie } from 'cookies-next';

export const getAuthedPageProps: GetServerSideProps = async (ctx) => {
  const { userId } = ctx.req.session;

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
  const { locale: sessionLocale } = ctx.req.session;
  const cookieLocale = getCookie('tipi-locale', { req: ctx.req });
  const browserLocale = ctx.req.headers['accept-language']?.split(',')[0];

  const locale = getLocaleFromString(String(sessionLocale || cookieLocale || browserLocale || 'en'));

  const englishMessages = (await import(`../messages/en.json`)).default;
  const messages = (await import(`../messages/${locale}.json`)).default;
  const mergedMessages = merge(englishMessages, messages);

  return {
    props: {
      messages: mergedMessages,
    },
  };
};
