'use server';

import { z } from 'zod';
import { AuthServiceClass } from '@/server/services/auth/auth.service';
import { db } from '@/server/db';
import { authActionClient } from '@/lib/safe-action';

const input = z.object({ password: z.string() });

/**
 * Given user's password, return the TOTP URI and key
 */
export const getTotpUriAction = authActionClient.schema(input).action(async ({ parsedInput: { password }, ctx: { user } }) => {
  const authService = new AuthServiceClass(db);
  const { key, uri } = await authService.getTotpUri({ userId: user.id, password });

  return { success: true, key, uri };
});
