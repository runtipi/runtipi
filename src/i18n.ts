import merge from 'lodash.merge';
import { getRequestConfig } from 'next-intl/server';
import { getCurrentLocale } from './utils/getCurrentLocale';

export default getRequestConfig(async () => {
  const locale = getCurrentLocale();

  const englishMessages = (await import(`./client/messages/en.json`)).default;
  const messages = (await import(`./client/messages/${locale}.json`)).default;
  const mergedMessages = merge(englishMessages, messages);

  return {
    locale,
    messages: mergedMessages,
  };
});
