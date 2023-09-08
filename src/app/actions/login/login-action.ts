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
 * Given a username and password, logs in the user and returns a totpSessionId
 * if that user has 2FA enabled.
 */
export const loginAction = action(input, async ({ username, password }) => {
  try {
    const authService = new AuthServiceClass(db);

    const { totpSessionId } = await authService.login({ username, password });

    if (!totpSessionId) {
      revalidatePath('/login');
    }

    return { totpSessionId, success: true };
  } catch (e) {
    return handleActionError(e);
  }
});
