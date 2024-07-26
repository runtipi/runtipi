'use server';

import { cookies } from 'next/headers';
import { db } from '@/server/db';
import { AuthServiceClass } from '@/server/services/auth/auth.service';
import { revalidatePath } from 'next/cache';
import { authActionClient } from '@/lib/safe-action';

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

  const authService = new AuthServiceClass(db);
  await authService.logout(sessionCookie.value);

  revalidatePath('/');

  return {
    success: true,
  };
});
