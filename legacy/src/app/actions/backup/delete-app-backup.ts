'use server';

import { authActionClient } from '@/lib/safe-action';
import { revalidatePath } from 'next/cache';
import { getClass } from 'src/inversify.config';
import { z } from 'zod';

const input = z.object({
  appId: z.string(),
  filename: z.string(),
});

/**
 * Given a backup id, deletes the backup.
 */
export const deleteAppBackupAction = authActionClient.schema(input).action(async ({ parsedInput: { filename, appId } }) => {
  const appBackupService = getClass('IAppBackupService');
  await appBackupService.executeCommand('deleteAppBackup', { filename, appId });

  revalidatePath('/apps');
  revalidatePath(`/app/${appId}`);
  revalidatePath(`/app-store/${appId}`);

  return { success: true };
});
