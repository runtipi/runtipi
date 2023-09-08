import { getLocaleFromString } from '@/shared/internationalization/locales';
import { cookies, headers } from 'next/headers';

/**
 * Get current locale from cookie or browser
 * @returns {string} current locale
 */
export const getCurrentLocale = () => {
  const cookieStore = cookies();
  const cookieLocale = cookieStore.get('tipi-locale');

  const headersList = headers();
  const browserLocale = headersList.get('accept-language');

  return getLocaleFromString(String(cookieLocale?.value || browserLocale || 'en'));
};
