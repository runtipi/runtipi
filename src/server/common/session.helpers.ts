import { setCookie } from 'cookies-next';
import { NextApiRequest, NextApiResponse } from 'next';
import { v4 } from 'uuid';
import TipiCache from '../core/TipiCache/TipiCache';

const COOKIE_MAX_AGE = 60 * 60 * 24; // 1 day
const COOKIE_NAME = 'tipi.sid';

export const generateSessionId = (prefix: string) => {
  return `${prefix}-${v4()}`;
};

export const setSession = async (sessionId: string, userId: string, req: NextApiRequest, res: NextApiResponse) => {
  setCookie(COOKIE_NAME, sessionId, { req, res, maxAge: COOKIE_MAX_AGE, httpOnly: true, secure: true, sameSite: false });

  const sessionKey = `session:${sessionId}`;

  await TipiCache.set(sessionKey, userId);
  await TipiCache.set(`session:${userId}:${sessionId}`, sessionKey);
};
