'use server';

import { z } from 'zod';
import { action } from '@/lib/safe-action';
import { AuthServiceClass } from '@/server/services/auth/auth.service';
import { db } from '@/server/db';
import { revalidatePath } from 'next/cache';
import { handleActionError } from '../utils/handle-action-error';
import { ensureUser } from '../utils/ensure-user';

const input = z.object({ password: z.string() });

/**
 * Given a valid user password, disable TOTP for the user
 */
export const disableTotpAction = action(input, async ({ password }) => {
  try {
    const { id } = await ensureUser();

    const authService = new AuthServiceClass(db);
    await authService.disableTotp({ userId: id, password });

    revalidatePath('/settings');

    return { success: true };
  } catch (e) {
    return handleActionError(e);
  }
});
