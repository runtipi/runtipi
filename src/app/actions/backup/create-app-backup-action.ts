'use server';

import { authActionClient } from '@/lib/safe-action';
import { appBackupService } from '@/server/services/app-backup/app-backup.service';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const input = z.object({
  id: z.string(),
});

/**
 * Given an app id, backs up the app.
 */
export const createAppBackupAction = authActionClient.schema(input).action(async ({ parsedInput: { id } }) => {
  await appBackupService.executeCommand('createAppBackup', { appId: id });

  revalidatePath('/apps');
  revalidatePath(`/app/${id}`);
  revalidatePath(`/app-store/${id}`);

  return { success: true };
});
