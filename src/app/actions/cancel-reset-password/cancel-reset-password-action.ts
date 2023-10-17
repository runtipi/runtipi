'use server';

import { z } from 'zod';
import { AuthServiceClass } from '@/server/services/auth/auth.service';
import { action } from '@/lib/safe-action';
import { revalidatePath } from 'next/cache';
import { handleActionError } from '../utils/handle-action-error';

const input = z.void();

/**
 * Given that a password change request has been made, cancels the password change request.
 */
export const cancelResetPasswordAction = action(input, async () => {
  try {
    await AuthServiceClass.cancelPasswordChangeRequest();

    revalidatePath('/reset-password');

    return { success: true };
  } catch (e) {
    return handleActionError(e);
  }
});
