// This file configures the initialization of Sentry for edge features (middleware, edge routes, and so on).
// The config you add here will be used whenever one of the edge features is loaded.
// Note that this config is unrelated to the Vercel Edge Runtime and is also required when running locally.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs';
import { TipiConfig } from '@/server/core/TipiConfig';
import { cleanseErrorData } from '@runtipi/shared/src/helpers/error-helpers';

if (TipiConfig.getConfig().allowErrorMonitoring) {
  Sentry.init({
    environment: TipiConfig.getConfig().NODE_ENV,
    dsn: 'https://7a73d72f886948478b55621e7b92c3c7@o4504242900238336.ingest.sentry.io/4504826587971584',
    debug: TipiConfig.getConfig().NODE_ENV === 'development',
    beforeSend: cleanseErrorData,
  });
}
