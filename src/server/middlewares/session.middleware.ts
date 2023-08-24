import RedisStore from 'connect-redis';
import session from 'express-session';
import { createClient } from 'redis';
import { getConfig } from '../core/TipiConfig';

// Initialize client.
const redisClient = createClient({
  url: `redis://${getConfig().REDIS_HOST}:6379`,
  password: getConfig().redisPassword,
});
redisClient.connect();

const redisStore = new RedisStore({
  client: redisClient,
  prefix: 'tipi:',
});

const COOKIE_MAX_AGE = 1000 * 60 * 60 * 24; // 1 day

export const sessionMiddleware = session({
  name: 'tipi.sid',
  cookie: { maxAge: COOKIE_MAX_AGE, httpOnly: true, secure: false, sameSite: false },
  store: redisStore,
  resave: false,
  saveUninitialized: false,
  secret: getConfig().jwtSecret,
});
