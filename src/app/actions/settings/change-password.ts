'use server';

import { z } from 'zod';
import { action } from '@/lib/safe-action';
import { AuthServiceClass } from '@/server/services/auth/auth.service';
import { db } from '@/server/db';
import { handleActionError } from '../utils/handle-action-error';
import { ensureUser } from '../utils/ensure-user';

const input = z.object({ currentPassword: z.string(), newPassword: z.string() });

/**
 * Given the current password and a new password, change the password of the current user.
 */
export const changePasswordAction = action(input, async ({ currentPassword, newPassword }) => {
  try {
    const { id } = await ensureUser();

    const authService = new AuthServiceClass(db);

    await authService.changePassword({ userId: id, currentPassword, newPassword });

    return { success: true };
  } catch (e) {
    return handleActionError(e);
  }
});
