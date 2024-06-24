'use server';

import { AuthServiceClass } from '@/server/services/auth/auth.service';
import { revalidatePath } from 'next/cache';
import { authActionClient } from '@/lib/safe-action';

/**
 * Given that a password change request has been made, cancels the password change request.
 */
export const cancelResetPasswordAction = authActionClient.action(async () => {
  await AuthServiceClass.cancelPasswordChangeRequest();

  revalidatePath('/reset-password');

  return { success: true };
});
