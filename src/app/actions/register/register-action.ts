'use server';

import { publicActionClient } from '@/lib/safe-action';
import { revalidatePath } from 'next/cache';
import { getClass } from 'src/inversify.config';
import { z } from 'zod';

const input = z.object({
  username: z.string(),
  password: z.string(),
});

/**
 * Given a username and password, registers the user and logs them in.
 */
export const registerAction = publicActionClient.schema(input).action(async ({ parsedInput: { username, password } }) => {
  const authService = getClass('IAuthService');

  const result = await authService.register({ username, password });

  if (result) {
    revalidatePath('/register');
  }

  return { success: true };
});
