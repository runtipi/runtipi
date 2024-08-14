import { getTranslator } from '@/lib/get-translator';
import { TipiConfig } from '@/server/core/TipiConfig';
import { type MessageKey, TranslatedError } from '@/server/utils/errors';
import * as Sentry from '@sentry/nextjs';
import { Logger } from '../../../server/core/Logger';

/**
 * Given an error, returns a 500 response with the translated error message.
 */
export const handleApiError = async (e: unknown) => {
  const originalMessage = e instanceof Error ? e.message : e;
  const status = e instanceof TranslatedError ? e.status : 500;
  const errorVariables = e instanceof TranslatedError ? e.variableValues : {};

  const translator = await getTranslator();
  const messageTranslated =
    e instanceof TranslatedError ? translator(originalMessage as MessageKey, errorVariables) : translator('INTERNAL_SERVER_ERROR');

  // Non TranslatedErrors are unexpected and should be reported to Sentry.
  if (!(e instanceof TranslatedError) && TipiConfig.getConfig().allowErrorMonitoring) {
    Logger.error(e);
    Sentry.captureException(e);
  }

  return new Response(messageTranslated as string, { status });
};
