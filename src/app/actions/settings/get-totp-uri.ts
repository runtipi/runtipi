'use server';

import { z } from 'zod';
import { action } from '@/lib/safe-action';
import { AuthServiceClass } from '@/server/services/auth/auth.service';
import { db } from '@/server/db';
import { handleActionError } from '../utils/handle-action-error';
import { ensureUser } from '../utils/ensure-user';

const input = z.object({ password: z.string() });

/**
 * Given user's password, return the TOTP URI and key
 */
export const getTotpUriAction = action(input, async ({ password }) => {
  try {
    const { id } = await ensureUser();

    const authService = new AuthServiceClass(db);
    const { key, uri } = await authService.getTotpUri({ userId: id, password });

    return { success: true, key, uri };
  } catch (e) {
    return handleActionError(e);
  }
});
