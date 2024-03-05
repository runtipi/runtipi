import { v4 } from 'uuid';
import { cookies } from 'next/headers';
import { tipiCache } from '../core/TipiCache';
import { db } from '../db';
import { AuthQueries } from '../queries/auth/auth.queries';

const COOKIE_MAX_AGE = 60 * 60 * 24; // 1 day
const COOKIE_NAME = 'tipi.sid';

export const generateSessionId = (prefix: string) => {
  return `${prefix}-${v4()}`;
};

export const setSession = async (sessionId: string, userId: string) => {
  const cookieStore = cookies();
  cookieStore.set(COOKIE_NAME, sessionId, { maxAge: COOKIE_MAX_AGE, httpOnly: true, secure: false, sameSite: false });

  const sessionKey = `session:${sessionId}`;

  await tipiCache.set(sessionKey, userId, COOKIE_MAX_AGE * 7);
  await tipiCache.set(`session:${userId}:${sessionId}`, sessionKey, COOKIE_MAX_AGE * 7);
};

export const getUserFromCookie = async () => {
  const authQueries = new AuthQueries(db);

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
