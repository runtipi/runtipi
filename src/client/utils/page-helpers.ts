import nookies from 'nookies';
import { GetServerSideProps } from 'next';
import { getLocaleFromString } from '@/shared/internationalization/locales';

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
  const cookies = nookies.get(ctx);
  const { locale: sessionLocale } = ctx.req.session;
  const { locale: cookieLocale } = cookies;
  const browserLocale = ctx.req.headers['accept-language']?.split(',')[0];

  const locale = sessionLocale || cookieLocale || browserLocale || 'en';

  return {
    props: {
      messages: (await import(`../messages/${getLocaleFromString(locale)}.json`)).default,
    },
  };
};
