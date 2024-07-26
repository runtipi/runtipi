'use server';

import { z } from 'zod';
import { db } from '@/server/db';
import { AuthServiceClass } from '@/server/services/auth/auth.service';
import { publicActionClient } from '@/lib/safe-action';

const input = z.object({
  newPassword: z.string(),
});

/**
 * Given that a password change request has been made, changes the password of the first operator.
 */
export const resetPasswordAction = publicActionClient.schema(input).action(async ({ parsedInput: { newPassword } }) => {
  const authService = new AuthServiceClass(db);
  const { email } = await authService.changeOperatorPassword({ newPassword });

  return { success: true, email };
});
