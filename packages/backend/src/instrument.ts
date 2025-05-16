import * as Sentry from '@sentry/nestjs';
import { nodeProfilingIntegration } from '@sentry/profiling-node';
import { cleanseErrorData } from './common/helpers/error-helpers';

Sentry.init({
  release: process.env.TIPI_VERSION,
  enabled: false,
  tracesSampleRate: 1.0,
  profileSessionSampleRate: 1.0,
  profileLifecycle: 'trace',
  dsn: 'https://6cc88df40d1cdd0222ff30d996ca457c@o4504242900238336.ingest.us.sentry.io/4508264534835200',
  environment: process.env.NODE_ENV,
  beforeSend: cleanseErrorData,
  includeLocalVariables: true,
  integrations: [Sentry.extraErrorDataIntegration(), Sentry.nestIntegration(), nodeProfilingIntegration()],
  initialScope: {
    tags: { version: process.env.TIPI_VERSION },
  },
});
