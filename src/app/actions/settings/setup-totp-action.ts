'use server';

import { z } from 'zod';
import { action } from '@/lib/safe-action';
import { getUserFromCookie } from '@/server/common/session.helpers';
import { AuthServiceClass } from '@/server/services/auth/auth.service';
import { db } from '@/server/db';
import { handleActionError } from '../utils/handle-action-error';

const input = z.object({ totpCode: z.string() });

/**
 * Given a valid user's TOTP code, activate TOTP for the user
 */
export const setupTotpAction = action(input, async ({ totpCode }) => {
  try {
    const user = await getUserFromCookie();

    if (!user) {
      throw new Error('User not found');
    }

    const authService = new AuthServiceClass(db);
    await authService.setupTotp({ userId: user.id, totpCode });

    return { success: true };
  } catch (e) {
    return handleActionError(e);
  }
});
