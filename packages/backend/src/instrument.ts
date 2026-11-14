import * as Sentry from '@sentry/nestjs';
import { cleanseErrorData } from './common/helpers/error-helpers';

const { NODE_ENV, TIPI_VERSION } = process.env;

Sentry.init({
  release: TIPI_VERSION,
  enabled: false,
  tracesSampleRate: 1.0,
  traceLifecycle: 'static',
  // Sentry 11 collects more data by default; preserve the previous privacy baseline.
  dataCollection: {
    userInfo: false,
    cookies: false,
    httpHeaders: {
      request: { deny: ['forwarded', '-ip', 'remote-', 'via', '-user'] },
      response: { deny: ['forwarded', '-ip', 'remote-', 'via', '-user'] },
    },
    httpBodies: [],
    urlQueryParams: { deny: ['forwarded', '-ip', 'remote-', 'via', '-user'] },
    genAI: { inputs: false, outputs: false },
    databaseQueryData: false,
    queues: false,
    graphQL: { document: false, variables: false },
  },
  dsn: 'https://6cc88df40d1cdd0222ff30d996ca457c@o4504242900238336.ingest.us.sentry.io/4508264534835200',
  environment: NODE_ENV,
  beforeSend: cleanseErrorData,
  includeLocalVariables: true,
  integrations: [Sentry.extraErrorDataIntegration(), Sentry.nestIntegration()],
  initialScope: {
    tags: { version: TIPI_VERSION },
  },
});
