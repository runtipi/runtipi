'use server';

import { authActionClient } from '@/lib/safe-action';
import { revalidatePath } from 'next/cache';
import { getClass } from 'src/inversify.config';
import { z } from 'zod';

const input = z.object({
  id: z.string(),
  filename: z.string(),
});

/**
 * Given an app id and a filename, restores the app to a previous state.
 */
export const restoreAppBackupAction = authActionClient.schema(input).action(async ({ parsedInput: { id, filename } }) => {
  const appBackupService = getClass('IAppBackupService');
  await appBackupService.executeCommand('restoreAppBackup', { appId: id, filename });

  revalidatePath('/apps');
  revalidatePath(`/app/${id}`);
  revalidatePath(`/app-store/${id}`);

  return { success: true };
});
