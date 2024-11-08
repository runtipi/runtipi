import { createTranslator } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';

export const getTranslator = async () => {
  const locale = await getLocale();
  const messages = await getMessages();

  return createTranslator({
    messages: messages as typeof import('../client/messages/en.json'),
    locale,
  });
};
