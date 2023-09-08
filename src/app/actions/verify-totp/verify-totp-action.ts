'use server';

import { z } from 'zod';
import { db } from '@/server/db';
import { AuthServiceClass } from '@/server/services/auth/auth.service';
import { action } from '@/lib/safe-action';
import { revalidatePath } from 'next/cache';
import { handleActionError } from '../utils/handle-action-error';

const input = z.object({
  totpCode: z.string(),
  totpSessionId: z.string(),
});

export const verifyTotpAction = action(input, async ({ totpSessionId, totpCode }) => {
  try {
    const authService = new AuthServiceClass(db);
    await authService.verifyTotp({ totpSessionId, totpCode });

    revalidatePath('/login');

    return { success: true };
  } catch (e) {
    return handleActionError(e);
  }
});
