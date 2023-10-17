'use server';

import { z } from 'zod';
import { db } from '@/server/db';
import { AuthServiceClass } from '@/server/services/auth/auth.service';
import { action } from '@/lib/safe-action';
import { revalidatePath } from 'next/cache';
import { handleActionError } from '../utils/handle-action-error';

const input = z.object({
  username: z.string(),
  password: z.string(),
});

/**
 * Given a username and password, registers the user and logs them in.
 */
export const registerAction = action(input, async ({ username, password }) => {
  try {
    const authService = new AuthServiceClass(db);

    const result = await authService.register({ username, password });

    if (result) {
      revalidatePath('/register');
    }

    return { success: true };
  } catch (e) {
    return handleActionError(e);
  }
});
