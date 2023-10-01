'use server';

import { z } from 'zod';
import { action } from '@/lib/safe-action';
import { getUserFromCookie } from '@/server/common/session.helpers';
import { AuthServiceClass } from '@/server/services/auth/auth.service';
import { db } from '@/server/db';
import { handleActionError } from '../utils/handle-action-error';

const input = z.object({ password: z.string() });

/**
 * Given user's password, return the TOTP URI and key
 */
export const getTotpUriAction = action(input, async ({ password }) => {
  try {
    const user = await getUserFromCookie();

    if (!user) {
      throw new Error('User not found');
    }

    const authService = new AuthServiceClass(db);
    const { key, uri } = await authService.getTotpUri({ userId: user.id, password });

    return { success: true, key, uri };
  } catch (e) {
    return handleActionError(e);
  }
});
