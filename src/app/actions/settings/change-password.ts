'use server';

import { z } from 'zod';
import { action } from '@/lib/safe-action';
import { getUserFromCookie } from '@/server/common/session.helpers';
import { AuthServiceClass } from '@/server/services/auth/auth.service';
import { db } from '@/server/db';
import { handleActionError } from '../utils/handle-action-error';

const input = z.object({ currentPassword: z.string(), newPassword: z.string() });

/**
 * Given the current password and a new password, change the password of the current user.
 */
export const changePasswordAction = action(input, async ({ currentPassword, newPassword }) => {
  try {
    const user = await getUserFromCookie();

    if (!user) {
      throw new Error('User not found');
    }

    const authService = new AuthServiceClass(db);

    await authService.changePassword({ userId: user.id, currentPassword, newPassword });

    return { success: true };
  } catch (e) {
    return handleActionError(e);
  }
});
