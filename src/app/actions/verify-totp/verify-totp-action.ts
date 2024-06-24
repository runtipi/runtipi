'use server';

import { z } from 'zod';
import { db } from '@/server/db';
import { AuthServiceClass } from '@/server/services/auth/auth.service';
import { publicActionClient } from '@/lib/safe-action';
import { revalidatePath } from 'next/cache';

const input = z.object({
  totpCode: z.string(),
  totpSessionId: z.string(),
});

export const verifyTotpAction = publicActionClient.schema(input).action(async ({ parsedInput: { totpSessionId, totpCode } }) => {
  const authService = new AuthServiceClass(db);
  await authService.verifyTotp({ totpSessionId, totpCode });

  revalidatePath('/login');

  return { success: true };
});
