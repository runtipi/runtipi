import { TranslatedError } from '@/server/utils/errors';
import { getClass } from 'src/inversify.config';

export const ensureUser = async () => {
  const sessionHelpers = getClass('ISessionManager');
  const user = await sessionHelpers.getUserFromCookie();

  if (!user) {
    throw new TranslatedError('SYSTEM_ERROR_YOU_MUST_BE_LOGGED_IN', {}, 401);
  }

  return user;
};
