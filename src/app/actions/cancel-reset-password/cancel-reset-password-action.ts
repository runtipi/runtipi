'use server';

import { revalidatePath } from 'next/cache';
import { publicActionClient } from '@/lib/safe-action';
import type { IAuthService } from '@/server/services/auth/auth.service';
import { container } from 'src/inversify.config';

/**
 * Given that a password change request has been made, cancels the password change request.
 */
export const cancelResetPasswordAction = publicActionClient.action(async () => {
  const authService = container.get<IAuthService>('IAuthService');
  await authService.cancelPasswordChangeRequest();

  revalidatePath('/reset-password');

  return { success: true };
});
