'use server';

import { z } from 'zod';
import { db } from '@/server/db';
import { AuthServiceClass } from '@/server/services/auth/auth.service';
import { publicActionClient } from '@/lib/safe-action';
import { revalidatePath } from 'next/cache';

const input = z.object({
  username: z.string(),
  password: z.string(),
});

/**
 * Given a username and password, registers the user and logs them in.
 */
export const registerAction = publicActionClient.schema(input).action(async ({ parsedInput: { username, password } }) => {
  const authService = new AuthServiceClass(db);

  const result = await authService.register({ username, password });

  if (result) {
    revalidatePath('/register');
  }

  return { success: true };
});
