import { MessageKey, TranslatedError } from '@/server/utils/errors';
import { getTranslatorFromCookie } from '@/lib/get-translator';

/**
 * Given an error, returns a failure object with the translated error message.
 */
export const handleActionError = async (e: unknown) => {
  const message = e instanceof Error ? e.message : e;
  const errorVariables = e instanceof TranslatedError ? e.variableValues : {};

  const translator = await getTranslatorFromCookie();
  const messageTranslated = e instanceof TranslatedError ? translator(message as MessageKey, errorVariables) : message;

  throw new Error(messageTranslated as string);
};
