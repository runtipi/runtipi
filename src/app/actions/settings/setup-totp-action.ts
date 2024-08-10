'use server';

import { authActionClient } from '@/lib/safe-action';
import type { IAuthService } from '@/server/services/auth/auth.service';
import { revalidatePath } from 'next/cache';
import { container } from 'src/inversify.config';
import { z } from 'zod';

const input = z.object({ totpCode: z.string() });

/**
 * Given a valid user's TOTP code, activate TOTP for the user
 */
export const setupTotpAction = authActionClient.schema(input).action(async ({ parsedInput: { totpCode }, ctx: { user } }) => {
  const authService = container.get<IAuthService>('IAuthService');
  await authService.setupTotp({ userId: user.id, totpCode });

  revalidatePath('/settings');

  return { success: true };
});
