import { useRouter } from 'next/router';
import { parseCookies, setCookie } from 'nookies';
import { trpc } from '@/utils/trpc';
import { Locale, getLocaleFromString } from '@/shared/internationalization/locales';

export const useLocale = () => {
  const router = useRouter();
  const cookies = parseCookies();
  const me = trpc.auth.me.useQuery();
  const changeUserLocale = trpc.auth.changeLocale.useMutation();
  const browserLocale = typeof window !== 'undefined' ? window.navigator.language : undefined;

  const locale = me.data?.locale || cookies.locale || browserLocale || 'en';
  const ctx = trpc.useContext();

  const changeLocale = async (l: Locale) => {
    if (me.data) {
      await changeUserLocale.mutateAsync({ locale: l });
      await ctx.invalidate();
    }

    setCookie(null, 'locale', l, {
      maxAge: 30 * 24 * 60 * 60,
      path: '/',
    });

    router.reload();
  };

  return { locale: getLocaleFromString(locale), changeLocale };
};
