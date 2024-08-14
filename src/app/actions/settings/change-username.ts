'use server';

import { authActionClient } from '@/lib/safe-action';
import type { IAuthService } from '@/server/services/auth/auth.service';
import { container } from 'src/inversify.config';
import { z } from 'zod';

const input = z.object({ newUsername: z.string().email(), password: z.string() });

/**
 * Given the current password and a new username, change the username of the current user.
 */
export const changeUsernameAction = authActionClient.schema(input).action(async ({ parsedInput: { newUsername, password }, ctx: { user } }) => {
  const authService = container.get<IAuthService>('IAuthService');

  await authService.changeUsername({ userId: user.id, newUsername, password });

  return { success: true };
});
