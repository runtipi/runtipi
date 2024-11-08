'use server';

import { authActionClient } from '@/lib/safe-action';
import { getClass } from 'src/inversify.config';
import { z } from 'zod';

const input = z.object({ newUsername: z.string().email(), password: z.string() });

/**
 * Given the current password and a new username, change the username of the current user.
 */
export const changeUsernameAction = authActionClient.schema(input).action(async ({ parsedInput: { newUsername, password }, ctx: { user } }) => {
  const authService = getClass('IAuthService');

  await authService.changeUsername({ userId: user.id, newUsername, password });

  return { success: true };
});
