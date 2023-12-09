import { getUserFromCookie } from '@/server/common/session.helpers';

export const ensureUser = async () => {
  const user = await getUserFromCookie();

  if (!user) {
    throw new Error('You must be logged in to perform this action');
  }

  return user;
};
