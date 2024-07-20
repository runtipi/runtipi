'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { appLifecycle } from '@/server/services/app-lifecycle/app-lifecycle.service';
import { authActionClient } from '@/lib/safe-action';

const input = z.object({
  id: z.string(),
  filename: z.string(),
});

/**
 * Given an app id and a filename, restores the app to a previous state.
 */
export const restoreBackupAction = authActionClient.schema(input).action(async ({ parsedInput: { id, filename } }) => {
  await appLifecycle.executeCommand('restoreBackup', { appId: id, filename });

  revalidatePath('/apps');
  revalidatePath(`/app/${id}`);
  revalidatePath(`/app-store/${id}`);

  return { success: true };
});
