import { getLocaleFromString } from '@/shared/internationalization/locales';
import merge from 'lodash.merge';
import { createTranslator } from 'next-intl';
import { cookies } from 'next/headers';

export const getTranslatorFromCookie = async () => {
  const cookieStore = cookies();
  const cookieLocale = cookieStore.get('tipi-locale');

  const locale = getLocaleFromString(cookieLocale?.value);

  const englishMessages = (await import(`../client/messages/en.json`)).default;
  const messages = (await import(`../client/messages/${locale}.json`)).default;
  const mergedMessages = merge(englishMessages, messages);

  return createTranslator({
    messages: mergedMessages,
    locale,
  });
};
