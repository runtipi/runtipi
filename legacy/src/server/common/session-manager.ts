import type { ICache } from '@runtipi/cache';
import type { User } from '@runtipi/db';
import { inject, injectable } from 'inversify';
import { cookies } from 'next/headers';
import { v4 } from 'uuid';
import type { IAuthQueries } from '../queries/auth/auth.queries';

export interface ISessionManager {
  generateSessionId: (prefix: string) => string;
  setSession: (sessionId: string, userId: string) => Promise<void>;
  getUserFromCookie: () => Promise<Pick<User, 'id' | 'username' | 'totpEnabled' | 'locale' | 'operator'> | undefined | null>;
}

@injectable()
export class SessionManager implements ISessionManager {
  private COOKIE_MAX_AGE = 60 * 60 * 24; // 1 day
  private COOKIE_NAME = 'tipi.sid';

  constructor(
    @inject('ICache') private cache: ICache,
    @inject('IAuthQueries') private authQueries: IAuthQueries,
  ) {}

  public generateSessionId = (prefix: string) => {
    return `${prefix}-${v4()}`;
  };

  public async setSession(sessionId: string, userId: string) {
    const cookieStore = cookies();
    cookieStore.set(this.COOKIE_NAME, sessionId, { maxAge: this.COOKIE_MAX_AGE, httpOnly: true, secure: false, sameSite: false });

    const sessionKey = `session:${sessionId}`;

    await this.cache.set(sessionKey, userId, this.COOKIE_MAX_AGE * 7);
    await this.cache.set(`session:${userId}:${sessionId}`, sessionKey, this.COOKIE_MAX_AGE * 7);
  }

  public async getUserFromCookie() {
    const cookieStore = cookies();
    const sessionId = cookieStore.get('tipi.sid');

    if (!sessionId) {
      return null;
    }

    const sessionKey = `session:${sessionId.value}`;
    const userId = await this.cache.get(sessionKey);

    if (!userId) {
      return null;
    }

    const user = await this.authQueries.getUserDtoById(Number(userId));

    return user;
  }
}
