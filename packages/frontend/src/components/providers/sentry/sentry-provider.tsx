import { useUserContext } from '@/context/user-context';
import * as Sentry from '@sentry/react';
import { type PropsWithChildren, useEffect } from 'react';

export const SentryProvider = ({ children }: PropsWithChildren) => {
  const { allowErrorMonitoring, version } = useUserContext();

  useEffect(() => {
    if (allowErrorMonitoring) {
      console.info('Error monitoring enabled, version:', version.current);
      Sentry.init({
        release: version.current,
        environment: 'production',
        tracesSampleRate: 1.0,
        dsn: 'https://aecdfa00da8a0b388b9cfa4e38ef78c4@o4504242900238336.ingest.us.sentry.io/4508296168275968',
        integrations: [Sentry.browserTracingIntegration()],
        initialScope: {
          tags: { version: version.current },
        },
      });
    }
  }, [allowErrorMonitoring, version.current]);

  return children;
};
