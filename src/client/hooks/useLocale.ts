import { useRouter } from 'next/router';
import Cookies from 'js-cookie';
import { trpc } from '@/utils/trpc';
import { Locale, getLocaleFromString } from '@/shared/internationalization/locales';

export const useLocale = () => {
  const router = useRouter();
  const me = trpc.auth.me.useQuery();
  const changeUserLocale = trpc.auth.changeLocale.useMutation();
  const browserLocale = typeof window !== 'undefined' ? window.navigator.language : undefined;
  const cookieLocale = Cookies.get('locale');

  const locale = me.data?.locale || cookieLocale || browserLocale || 'en';
  const ctx = trpc.useContext();

  const changeLocale = async (l: Locale) => {
    if (me.data) {
      await changeUserLocale.mutateAsync({ locale: l });
      await ctx.invalidate();
    }

    Cookies.set('locale', l, {
      expires: 30,
      path: '/',
    });

    router.reload();
  };

  return { locale: getLocaleFromString(locale), changeLocale };
};
