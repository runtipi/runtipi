import session from 'express-session';
import config from '../../config';
import SessionFileStore from 'session-file-store';
import { COOKIE_MAX_AGE, __prod__ } from '../../config/constants/constants';

const getSessionMiddleware = () => {
  const FileStore = SessionFileStore(session);

  const sameSite = __prod__ ? 'lax' : 'none';

  return session({
    name: 'qid',
    store: new FileStore(),
    cookie: { maxAge: COOKIE_MAX_AGE, secure: false, sameSite, httpOnly: true },
    secret: config.JWT_SECRET,
    resave: false,
    saveUninitialized: false,
  });
};

export default getSessionMiddleware;
