import { CacheService } from '@/core/cache/cache.service';
import { ConfigurationService } from '@/core/config/configuration.service';
import { fromPartial } from '@total-typescript/shoehorn';
import { SessionManager } from '../session.manager';

export const createSessionStore = (sessionMaxAgeInDays = 7) => {
  const entries = new Map<string, { value: string; expiration: number }>();
  const cache = fromPartial<CacheService>({
    set(key: string, value: string, expiration = 86_400) {
      entries.set(key, { value, expiration: Date.now() + expiration * 1000 });
    },
    get(key: string) {
      const entry = entries.get(key);
      if (!entry || entry.expiration < Date.now()) {
        entries.delete(key);
        return undefined;
      }

      return entry.value;
    },
    del(key: string) {
      entries.delete(key);
    },
    async getByPrefix(prefix: string) {
      return [...entries].filter(([key]) => key.startsWith(prefix)).map(([key, entry]) => ({ key, val: entry.value }));
    },
    clear() {
      entries.clear();
    },
  });

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

  return { cache, config, sessions, settings, createForwardAuthSession };
};
