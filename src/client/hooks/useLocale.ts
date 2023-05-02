import { parseCookies, setCookie } from 'nookies';

type Locale = 'en' | 'fr';

export const useLocale = () => {
  const cookies = parseCookies();

  const changeLocale = (l: Locale) => {
    setCookie(null, 'locale', l, {
      maxAge: 30 * 24 * 60 * 60,
      path: '/',
    });
  };

  return { locale: cookies.locale || 'en', changeLocale };
};
