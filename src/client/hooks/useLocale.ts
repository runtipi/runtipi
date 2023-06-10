import { setCookie, getCookie } from 'cookies-next';
import { useRouter } from 'next/router';
import { trpc } from '@/utils/trpc';
import { Locale, getLocaleFromString } from '@/shared/internationalization/locales';

export const useLocale = () => {
  const router = useRouter();
  const me = trpc.auth.me.useQuery();
  const changeUserLocale = trpc.auth.changeLocale.useMutation();
  const browserLocale = typeof window !== 'undefined' ? window.navigator.language : undefined;
  const cookieLocale = getCookie('tipi-locale');

  const locale = String(me.data?.locale || cookieLocale || browserLocale || 'en');
  const ctx = trpc.useContext();

  const changeLocale = async (l: Locale) => {
    if (me.data) {
      await changeUserLocale.mutateAsync({ locale: l });
      await ctx.invalidate();
    }

    setCookie('tipi-locale', l, {
      expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365),
    });

    router.reload();
  };

  return { locale: getLocaleFromString(locale), changeLocale };
};
