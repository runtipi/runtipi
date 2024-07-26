'use server';

import { z } from 'zod';
import { authActionClient } from '@/lib/safe-action';
import { revalidatePath } from 'next/cache';
import { appBackupService } from '@/server/services/app-backup/app-backup.service';

const input = z.object({
  appId: z.string(),
  filename: z.string(),
});

/**
 * Given a backup id, deletes the backup.
 */
export const deleteAppBackupAction = authActionClient.schema(input).action(async ({ parsedInput: { filename, appId } }) => {
  await appBackupService.executeCommand('deleteAppBackup', { filename, appId });

  revalidatePath('/apps');
  revalidatePath(`/app/${appId}`);
  revalidatePath(`/app-store/${appId}`);

  return { success: true };
});
