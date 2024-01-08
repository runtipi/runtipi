// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import { cleanseErrorData } from '@runtipi/shared/src/helpers/error-helpers';
import * as Sentry from '@sentry/nextjs';
import { getConfig } from '@/server/core/TipiConfig';

if (getConfig().allowErrorMonitoring && getConfig().NODE_ENV === 'production') {
  Sentry.init({
    environment: getConfig().NODE_ENV,
    dsn: 'https://7a73d72f886948478b55621e7b92c3c7@o4504242900238336.ingest.sentry.io/4504826587971584',
    debug: getConfig().NODE_ENV === 'development',
    enableTracing: false,
    beforeSend: cleanseErrorData,
  });
}
