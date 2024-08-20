'use server';

import { authActionClient } from '@/lib/safe-action';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { getClass } from 'src/inversify.config';

/**
 * Logs out the current user making the request.
 */
export const logoutAction = authActionClient.action(async () => {
  const cookieStore = cookies();
  const sessionCookie = cookieStore.get('tipi.sid');

  if (!sessionCookie) {
    return {
      success: true,
    };
  }

  const authService = getClass('IAuthService');
  await authService.logout(sessionCookie.value);

  revalidatePath('/');

  return {
    success: true,
  };
});
