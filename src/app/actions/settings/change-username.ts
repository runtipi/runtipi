'use server';

import { z } from 'zod';
import { action } from '@/lib/safe-action';
import { AuthServiceClass } from '@/server/services/auth/auth.service';
import { db } from '@/server/db';
import { handleActionError } from '../utils/handle-action-error';
import { ensureUser } from '../utils/ensure-user';

const input = z.object({ newUsername: z.string().email(), password: z.string() });

/**
 * Given the current password and a new username, change the username of the current user.
 */
export const changeUsernameAction = action(input, async ({ newUsername, password }) => {
  try {
    const { id } = await ensureUser();

    const authService = new AuthServiceClass(db);

    await authService.changeUsername({ userId: id, newUsername, password });

    return { success: true };
  } catch (e) {
    return handleActionError(e);
  }
});
