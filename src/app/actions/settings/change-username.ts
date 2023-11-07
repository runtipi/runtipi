'use server';

import { z } from 'zod';
import { action } from '@/lib/safe-action';
import { getUserFromCookie } from '@/server/common/session.helpers';
import { AuthServiceClass } from '@/server/services/auth/auth.service';
import { db } from '@/server/db';
import { handleActionError } from '../utils/handle-action-error';

const input = z.object({ newUsername: z.string().email(), password: z.string() });

/**
 * Given the current password and a new username, change the username of the current user.
 */
export const changeUsernameAction = action(input, async ({ newUsername, password }) => {
  try {
    const user = await getUserFromCookie();

    if (!user) {
      throw new Error('User not found');
    }

    const authService = new AuthServiceClass(db);

    await authService.changeUsername({ userId: user.id, newUsername, password });

    return { success: true };
  } catch (e) {
    return handleActionError(e);
  }
});
