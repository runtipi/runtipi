'use server';

import { publicActionClient } from '@/lib/safe-action';
import { revalidatePath } from 'next/cache';
import { getClass } from 'src/inversify.config';

/**
 * Given that a password change request has been made, cancels the password change request.
 */
export const cancelResetPasswordAction = publicActionClient.action(async () => {
  const authService = getClass('IAuthService');
  await authService.cancelPasswordChangeRequest();

  revalidatePath('/reset-password');

  return { success: true };
});
