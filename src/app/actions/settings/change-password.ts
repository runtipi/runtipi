'use server';

import { z } from 'zod';
import { authActionClient } from '@/lib/safe-action';
import type { IAuthService } from '@/server/services/auth/auth.service';
import { container } from 'src/inversify.config';

const input = z.object({ currentPassword: z.string(), newPassword: z.string() });

/**
 * Given the current password and a new password, change the password of the current user.
 */
export const changePasswordAction = authActionClient
  .schema(input)
  .action(async ({ parsedInput: { currentPassword, newPassword }, ctx: { user } }) => {
    const authService = container.get<IAuthService>('IAuthService');

    await authService.changePassword({ userId: user.id, currentPassword, newPassword });

    return { success: true };
  });
