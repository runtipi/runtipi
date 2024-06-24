'use server';

import { z } from 'zod';
import { AuthServiceClass } from '@/server/services/auth/auth.service';
import { db } from '@/server/db';
import { revalidatePath } from 'next/cache';
import { authActionClient } from '@/lib/safe-action';

const input = z.object({ totpCode: z.string() });

/**
 * Given a valid user's TOTP code, activate TOTP for the user
 */
export const setupTotpAction = authActionClient.schema(input).action(async ({ parsedInput: { totpCode }, ctx: { user } }) => {
  const authService = new AuthServiceClass(db);
  await authService.setupTotp({ userId: user.id, totpCode });

  revalidatePath('/settings');

  return { success: true };
});
