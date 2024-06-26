import * as Sentry from '@sentry/nextjs';
import { ensureUser } from '@/actions/utils/ensure-user';
import { MessageKey, TranslatedError } from '@/server/utils/errors';
import { createSafeActionClient } from 'next-safe-action';
import { getTranslator } from './get-translator';
import { TipiConfig } from '@/server/core/TipiConfig';
import { revalidatePath } from 'next/cache';

export const publicActionClient = createSafeActionClient({
  handleReturnedServerError: async (e) => {
    const message = e instanceof Error ? e.message : e;
    const errorVariables = e instanceof TranslatedError ? e.variableValues : {};

    const translator = await getTranslator();
    const messageTranslated = e instanceof TranslatedError ? translator(message as MessageKey, errorVariables) : message;

    // Non TranslatedErrors are unexpected and should be reported to Sentry.
    if (!(e instanceof TranslatedError) && TipiConfig.getConfig().allowErrorMonitoring) {
      Sentry.captureException(e);
    }

    // eslint-disable-next-line no-console
    console.error('Error from server', e.message);

    revalidatePath('/');

    return messageTranslated || 'An unexpected error occurred';
  },
});

export const authActionClient = publicActionClient.use(async ({ next }) => {
  // TODO: Test that this throws and shows the error message in the client
  const user = await ensureUser();

  return next({ ctx: { user } });
});
