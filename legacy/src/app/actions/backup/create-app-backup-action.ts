'use server';

import { authActionClient } from '@/lib/safe-action';
import { revalidatePath } from 'next/cache';
import { getClass } from 'src/inversify.config';
import { z } from 'zod';

const input = z.object({
  id: z.string(),
});

/**
 * Given an app id, backs up the app.
 */
export const createAppBackupAction = authActionClient.schema(input).action(async ({ parsedInput: { id } }) => {
  const appBackupService = getClass('IAppBackupService');
  await appBackupService.executeCommand('createAppBackup', { appId: id });

  revalidatePath('/apps');
  revalidatePath(`/app/${id}`);
  revalidatePath(`/app-store/${id}`);

  return { success: true };
});
