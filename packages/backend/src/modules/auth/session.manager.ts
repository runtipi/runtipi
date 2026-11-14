import crypto from 'node:crypto';
import { CacheService } from '@/core/cache/cache.service';
import { ConfigurationService } from '@/core/config/configuration.service';
import { Injectable } from '@nestjs/common';
import { type } from 'arktype';

const forwardAuthRecordSchema = type({ sessionId: 'string', host: 'string' });
const FORWARD_AUTH_GRANT_EXPIRATION = 60;

@Injectable()
export class SessionManager {
  constructor(
    private cache: CacheService,
    private config: ConfigurationService,
  ) {}

  public getSessionMaxAgeInSeconds() {
    return this.config.get('userSettings').sessionMaxAgeInDays * 24 * 60 * 60;
  }

  private storeSession(sessionId: string, userId: number) {
    const sessionKey = `session:${sessionId}`;
    const maxAge = this.getSessionMaxAgeInSeconds();

    this.cache.set(sessionKey, String(userId), maxAge);
    this.cache.set(`session:${userId}:${sessionId}`, sessionKey, maxAge);
  }

  public async createSession(userId: number) {
    const sessionId = crypto.randomUUID();
    this.cache.transaction(() => this.storeSession(sessionId, userId));

    return sessionId;
  }

  public getSessionUserId(sessionId: string) {
    const userId = Number(this.cache.get(`session:${sessionId}`));

    if (Number.isSafeInteger(userId) && userId > 0) {
      return userId;
    }
  }

  public refreshSession(sessionId: string) {
    return this.cache.transaction(() => {
      const userId = this.getSessionUserId(sessionId);
      if (userId === undefined) {
        return false;
      }

      this.storeSession(sessionId, userId);
      return true;
    });
  }

  private readForwardAuthRecord(recordType: 'grant' | 'session', id: string) {
    const value = this.cache.get(`forward-auth-${recordType}:${id}`);

    try {
      const session = forwardAuthRecordSchema(JSON.parse(value ?? 'null'));
      if (session instanceof type.errors || !session.sessionId || !session.host) {
        return;
      }

      return { sessionId: session.sessionId, host: session.host.toLowerCase() };
    } catch {
      return;
    }
  }

  private storeForwardAuthRecord(recordType: 'grant' | 'session', id: string, session: typeof forwardAuthRecordSchema.infer, maxAge: number) {
    const key = `forward-auth-${recordType}:${id}`;

    this.cache.set(key, JSON.stringify(session), maxAge);
    this.cache.set(`forward-auth-by-session:${session.sessionId}:${recordType}:${id}`, key, maxAge);
  }

  public createForwardAuthGrant(sessionId: string, host: string) {
    return this.cache.transaction(() => {
      if (this.getSessionUserId(sessionId) === undefined) {
        return;
      }

      const grantId = crypto.randomUUID();
      this.storeForwardAuthRecord('grant', grantId, { sessionId, host: host.toLowerCase() }, FORWARD_AUTH_GRANT_EXPIRATION);

      return grantId;
    });
  }

  public consumeForwardAuthGrant(grantId: string, host: string) {
    return this.cache.transaction(() => {
      const session = this.readForwardAuthRecord('grant', grantId);
      this.cache.del(`forward-auth-grant:${grantId}`);

      if (session) {
        this.cache.del(`forward-auth-by-session:${session.sessionId}:grant:${grantId}`);
      }

      if (!session || session.host !== host.toLowerCase() || this.getSessionUserId(session.sessionId) === undefined) {
        return;
      }

      const forwardAuthSessionId = crypto.randomUUID();
      this.storeForwardAuthRecord('session', forwardAuthSessionId, session, this.getSessionMaxAgeInSeconds());

      return forwardAuthSessionId;
    });
  }

  public getForwardAuthSession(forwardAuthSessionId: string, host: string | undefined) {
    const session = this.readForwardAuthRecord('session', forwardAuthSessionId);
    if (!session || session.host !== host?.toLowerCase()) {
      return;
    }

    const userId = this.getSessionUserId(session.sessionId);
    if (userId === undefined) {
      return;
    }

    return { ...session, userId };
  }

  public refreshForwardAuthSession(forwardAuthSessionId: string, host: string | undefined) {
    return this.cache.transaction(() => {
      const session = this.getForwardAuthSession(forwardAuthSessionId, host);
      if (!session) {
        return false;
      }

      this.storeSession(session.sessionId, session.userId);
      this.storeForwardAuthRecord(
        'session',
        forwardAuthSessionId,
        { sessionId: session.sessionId, host: session.host },
        this.getSessionMaxAgeInSeconds(),
      );
      return true;
    });
  }

  public deleteForwardAuthSession(forwardAuthSessionId: string) {
    return this.cache.transaction(() => {
      const session = this.readForwardAuthRecord('session', forwardAuthSessionId);
      this.cache.del(`forward-auth-session:${forwardAuthSessionId}`);

      if (session) {
        this.cache.del(`forward-auth-by-session:${session.sessionId}:session:${forwardAuthSessionId}`);
      }
    });
  }

  private deleteStoredSession(sessionId: string) {
    const userId = this.getSessionUserId(sessionId);
    this.cache.del(`session:${sessionId}`);

    if (userId !== undefined) {
      this.cache.del(`session:${userId}:${sessionId}`);
    }

    const entries = this.cache.getByPrefix(`forward-auth-by-session:${sessionId}:`);

    for (const entry of entries) {
      this.cache.del(entry.key);
      this.cache.del(entry.val);
    }
  }

  public deleteSession(sessionId: string) {
    this.cache.transaction(() => this.deleteStoredSession(sessionId));
  }

  public destroyAllSessionsByUserId(userId: number) {
    this.cache.transaction(() => {
      const prefix = `session:${userId}:`;
      const sessions = this.cache.getByPrefix(prefix);

      for (const { key } of sessions) {
        this.cache.del(key);
        this.deleteStoredSession(key.slice(prefix.length));
      }
    });
  }

  public generateSalt() {
    return crypto.randomBytes(16).toString('hex');
  }
}
