import connectRedis from 'connect-redis';
import session from 'express-session';
import { createClient } from 'redis';
import config from '../../config';
import { COOKIE_MAX_AGE, __prod__ } from '../../config/constants/constants';

const getSessionMiddleware = async (): Promise<any> => {
  const RedisStore = connectRedis(session);

  const redisClient = createClient(config.redis);

  await redisClient.connect();

  return session({
    name: 'qid',
    store: new RedisStore({ client: redisClient as any, disableTouch: true }),
    cookie: { maxAge: COOKIE_MAX_AGE, secure: __prod__, sameSite: 'lax', httpOnly: true },
    secret: config.JWT_SECRET,
    resave: false,
    saveUninitialized: false,
  });
};

export default getSessionMiddleware;
