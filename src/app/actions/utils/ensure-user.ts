import { getUserFromCookie } from '@/server/common/session.helpers';
import { TranslatedError } from '@/server/utils/errors';

export const ensureUser = async () => {
  const user = await getUserFromCookie();

  if (!user) {
    throw new TranslatedError('SYSTEM_ERROR_YOU_MUST_BE_LOGGED_IN', {}, 401);
  }

  return user;
};
