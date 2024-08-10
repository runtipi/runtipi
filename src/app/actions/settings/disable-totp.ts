'use server';

import { authActionClient } from '@/lib/safe-action';
import type { IAuthService } from '@/server/services/auth/auth.service';
import { revalidatePath } from 'next/cache';
import { container } from 'src/inversify.config';
import { z } from 'zod';

const input = z.object({ password: z.string() });

/**
 * Given a valid user password, disable TOTP for the user
 */
export const disableTotpAction = authActionClient.schema(input).action(async ({ parsedInput: { password }, ctx: { user } }) => {
  const authService = container.get<IAuthService>('IAuthService');
  await authService.disableTotp({ userId: user.id, password });

  revalidatePath('/settings');

  return { success: true };
});
