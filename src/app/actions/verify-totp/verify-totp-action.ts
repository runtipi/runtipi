'use server';

import { z } from 'zod';
import { publicActionClient } from '@/lib/safe-action';
import { revalidatePath } from 'next/cache';
import { container } from 'src/inversify.config';
import type { IAuthService } from '@/server/services/auth/auth.service';

const input = z.object({
  totpCode: z.string(),
  totpSessionId: z.string(),
});

export const verifyTotpAction = publicActionClient.schema(input).action(async ({ parsedInput: { totpSessionId, totpCode } }) => {
  const authService = container.get<IAuthService>('IAuthService');
  await authService.verifyTotp({ totpSessionId, totpCode });

  revalidatePath('/login');

  return { success: true };
});
