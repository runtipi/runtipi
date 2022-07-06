import session from 'express-session';
import config from '../../config';
import SessionFileStore from 'session-file-store';
import { COOKIE_MAX_AGE } from '../../config/constants/constants';

const getSessionMiddleware = () => {
  const FileStore = SessionFileStore(session);

  return session({
    name: 'qid',
    store: new FileStore(),
    cookie: { maxAge: COOKIE_MAX_AGE, secure: false, sameSite: 'lax', httpOnly: true },
    secret: config.JWT_SECRET,
    resave: false,
    saveUninitialized: false,
  });
};

export default getSessionMiddleware;
