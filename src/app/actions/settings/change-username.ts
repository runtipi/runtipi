'use server';

import { z } from 'zod';
import { authActionClient } from '@/lib/safe-action';
import { AuthServiceClass } from '@/server/services/auth/auth.service';
import { db } from '@/server/db';

const input = z.object({ newUsername: z.string().email(), password: z.string() });

/**
 * Given the current password and a new username, change the username of the current user.
 */
export const changeUsernameAction = authActionClient.schema(input).action(async ({ parsedInput: { newUsername, password }, ctx: { user } }) => {
  const authService = new AuthServiceClass(db);

  await authService.changeUsername({ userId: user.id, newUsername, password });

  return { success: true };
});
