'use server';

import { publicActionClient } from '@/lib/safe-action';
import type { IAuthService } from '@/server/services/auth/auth.service';
import { revalidatePath } from 'next/cache';
import { container } from 'src/inversify.config';
import { z } from 'zod';

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
