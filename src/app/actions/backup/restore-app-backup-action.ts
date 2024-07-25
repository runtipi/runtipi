'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { authActionClient } from '@/lib/safe-action';
import { appBackupService } from '@/server/services/app-backup/app-backup.service';

const input = z.object({
  id: z.string(),
  filename: z.string(),
});

/**
 * Given an app id and a filename, restores the app to a previous state.
 */
export const restoreAppBackupAction = authActionClient.schema(input).action(async ({ parsedInput: { id, filename } }) => {
  await appBackupService.executeCommand('restoreAppBackup', { appId: id, filename });

  revalidatePath('/apps');
  revalidatePath(`/app/${id}`);
  revalidatePath(`/app-store/${id}`);

  return { success: true };
});
