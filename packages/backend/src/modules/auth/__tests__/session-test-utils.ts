import { createTestCache } from '@/core/cache/__tests__/cache-test-utils';
import { ConfigurationService } from '@/core/config/configuration.service';
import { fromPartial } from '@total-typescript/shoehorn';
import { SessionManager } from '../session.manager';

export const createSessionStore = (sessionMaxAgeInDays = 7) => {
  const { cache, database } = createTestCache();

  const settings = { sessionMaxAgeInDays, experimental: { insecureCookie: false } };
  const config = fromPartial<ConfigurationService>({
    get: () => fromPartial(settings),
  });
  const sessions = new SessionManager(cache, config);

  const createForwardAuthSession = (sessionId: string, host = 'app.example.com') => {
    const grantId = sessions.createForwardAuthGrant(sessionId, host);
    if (!grantId) {
      throw new Error('Unable to create the forward-auth grant');
    }

    const forwardAuthSessionId = sessions.consumeForwardAuthGrant(grantId, host);
    if (!forwardAuthSessionId) {
      throw new Error('Unable to exchange the forward-auth grant');
    }

    return forwardAuthSessionId;
  };

  return { cache, database, config, sessions, settings, createForwardAuthSession };
};
