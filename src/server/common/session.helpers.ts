import { v4 } from 'uuid';
import { cookies } from 'next/headers';
import type { IAuthQueries } from '../queries/auth/auth.queries';
import { container } from 'src/inversify.config';
import type { ITipiCache } from '../core/TipiCache/TipiCache';

const COOKIE_MAX_AGE = 60 * 60 * 24; // 1 day
const COOKIE_NAME = 'tipi.sid';

export const generateSessionId = (prefix: string) => {
  return `${prefix}-${v4()}`;
};

export const setSession = async (sessionId: string, userId: string) => {
  const tipiCache = container.get<ITipiCache>('ITipiCache');
  const cookieStore = cookies();
  cookieStore.set(COOKIE_NAME, sessionId, { maxAge: COOKIE_MAX_AGE, httpOnly: true, secure: false, sameSite: false });

  const sessionKey = `session:${sessionId}`;

  await tipiCache.set(sessionKey, userId, COOKIE_MAX_AGE * 7);
  await tipiCache.set(`session:${userId}:${sessionId}`, sessionKey, COOKIE_MAX_AGE * 7);
};

export const getUserFromCookie = async () => {
  const tipiCache = container.get<ITipiCache>('ITipiCache');
  const authQueries = container.get<IAuthQueries>('IAuthQueries');

  const cookieStore = cookies();
  const sessionId = cookieStore.get('tipi.sid');

  if (!sessionId) {
    return null;
  }

  const sessionKey = `session:${sessionId.value}`;
  const userId = await tipiCache.get(sessionKey);

  if (!userId) {
    return null;
  }

  const user = await authQueries.getUserDtoById(Number(userId));

  return user;
};
