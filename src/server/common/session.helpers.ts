import { setCookie } from 'cookies-next';
import { NextApiRequest, NextApiResponse } from 'next';
import { v4 } from 'uuid';
import { TipiCache } from '../core/TipiCache/TipiCache';

const COOKIE_MAX_AGE = 60 * 60 * 24; // 1 day
const COOKIE_NAME = 'tipi.sid';

export const generateSessionId = (prefix: string) => {
  return `${prefix}-${v4()}`;
};

export const setSession = async (sessionId: string, userId: string, req: NextApiRequest, res: NextApiResponse) => {
  const cache = new TipiCache();

  setCookie(COOKIE_NAME, sessionId, { req, res, maxAge: COOKIE_MAX_AGE, httpOnly: true, secure: true, sameSite: false });

  const sessionKey = `session:${sessionId}`;

  await cache.set(sessionKey, userId);
  await cache.set(`session:${userId}:${sessionId}`, sessionKey);

  await cache.close();
};
