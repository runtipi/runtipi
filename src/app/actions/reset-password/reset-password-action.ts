'use server';

import { z } from 'zod';
import { db } from '@/server/db';
import { AuthServiceClass } from '@/server/services/auth/auth.service';
import { action } from '@/lib/safe-action';
import { handleActionError } from '../utils/handle-action-error';

const input = z.object({
  newPassword: z.string(),
});

/**
 * Given that a password change request has been made, changes the password of the first operator.
 */
export const resetPasswordAction = action(input, async ({ newPassword }) => {
  try {
    const authService = new AuthServiceClass(db);

    const { email } = await authService.changeOperatorPassword({ newPassword });

    return { success: true, email };
  } catch (e) {
    return handleActionError(e);
  }
});
