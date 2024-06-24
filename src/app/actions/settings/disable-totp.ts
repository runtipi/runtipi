'use server';

import { z } from 'zod';
import { AuthServiceClass } from '@/server/services/auth/auth.service';
import { db } from '@/server/db';
import { revalidatePath } from 'next/cache';
import { authActionClient } from '@/lib/safe-action';

const input = z.object({ password: z.string() });

/**
 * Given a valid user password, disable TOTP for the user
 */
export const disableTotpAction = authActionClient.schema(input).action(async ({ parsedInput: { password }, ctx: { user } }) => {
  const authService = new AuthServiceClass(db);
  await authService.disableTotp({ userId: user.id, password });

  revalidatePath('/settings');

  return { success: true };
});
