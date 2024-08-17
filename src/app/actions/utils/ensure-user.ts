import type { ISessionManager } from '@/server/common/session-manager';
import { TranslatedError } from '@/server/utils/errors';
import { container } from 'src/inversify.config';

export const ensureUser = async () => {
  const sessionHelpers = container.get<ISessionManager>('ISessionManager');
  const user = await sessionHelpers.getUserFromCookie();

  if (!user) {
    throw new TranslatedError('SYSTEM_ERROR_YOU_MUST_BE_LOGGED_IN', {}, 401);
  }

  return user;
};
