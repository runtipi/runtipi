'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { authActionClient } from '@/lib/safe-action';
import { container } from 'src/inversify.config';
import type { IAuthService } from '@/server/services/auth/auth.service';

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

  const authService = container.get<IAuthService>('IAuthService');
  await authService.logout(sessionCookie.value);

  revalidatePath('/');

  return {
    success: true,
  };
});
