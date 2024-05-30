import * as Sentry from '@sentry/nextjs';
import { cleanseErrorData } from '@runtipi/shared';

export async function register() {
  if (process.env.ALLOW_ERROR_MONITORING === 'true' && process.env.NODE_ENV === 'production' && process.env.LOCAL !== 'true') {
    if (process.env.NEXT_RUNTIME === 'nodejs') {
      Sentry.init({
        environment: process.env.NODE_ENV,
        dsn: 'https://7a73d72f886948478b55621e7b92c3c7@o4504242900238336.ingest.sentry.io/4504826587971584',
        beforeSend: cleanseErrorData,
        integrations: [Sentry.extraErrorDataIntegration()],
        tracesSampleRate: 1.0,
      });
    }

    if (process.env.NEXT_RUNTIME === 'edge') {
      Sentry.init({
        environment: process.env.NODE_ENV,
        dsn: 'https://7a73d72f886948478b55621e7b92c3c7@o4504242900238336.ingest.sentry.io/4504826587971584',
        beforeSend: cleanseErrorData,
        integrations: [Sentry.extraErrorDataIntegration()],
        tracesSampleRate: 1.0,
      });
    }
  }
}
