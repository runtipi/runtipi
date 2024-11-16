import { useUserContext } from '@/context/user-context';
import * as Sentry from '@sentry/react';
import { type PropsWithChildren, useEffect } from 'react';

export const SentryProvider = ({ children }: PropsWithChildren) => {
  const { allowErrorMonitoring } = useUserContext();

  useEffect(() => {
    if (allowErrorMonitoring) {
      Sentry.init({
        dsn: 'https://aecdfa00da8a0b388b9cfa4e38ef78c4@o4504242900238336.ingest.us.sentry.io/4508296168275968',
        integrations: [Sentry.browserTracingIntegration()],
      });
    }
  }, [allowErrorMonitoring]);

  return children;
};
