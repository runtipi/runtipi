'use server';

import { publicActionClient } from '@/lib/safe-action';
import type { IAuthService } from '@/server/services/auth/auth.service';
import { container } from 'src/inversify.config';
import { z } from 'zod';

const input = z.object({
  newPassword: z.string(),
});

/**
 * Given that a password change request has been made, changes the password of the first operator.
 */
export const resetPasswordAction = publicActionClient.schema(input).action(async ({ parsedInput: { newPassword } }) => {
  const authService = container.get<IAuthService>('IAuthService');
  const { email } = await authService.changeOperatorPassword({ newPassword });

  return { success: true, email };
});
