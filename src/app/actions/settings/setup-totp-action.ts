'use server';

import { z } from 'zod';
import { action } from '@/lib/safe-action';
import { AuthServiceClass } from '@/server/services/auth/auth.service';
import { db } from '@/server/db';
import { revalidatePath } from 'next/cache';
import { handleActionError } from '../utils/handle-action-error';
import { ensureUser } from '../utils/ensure-user';

const input = z.object({ totpCode: z.string() });

/**
 * Given a valid user's TOTP code, activate TOTP for the user
 */
export const setupTotpAction = action(input, async ({ totpCode }) => {
  try {
    const { id } = await ensureUser();

    const authService = new AuthServiceClass(db);
    await authService.setupTotp({ userId: id, totpCode });

    revalidatePath('/settings');

    return { success: true };
  } catch (e) {
    return handleActionError(e);
  }
});
