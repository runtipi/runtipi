'use server';

import { authActionClient } from '@/lib/safe-action';
import { revalidatePath } from 'next/cache';
import { getClass } from 'src/inversify.config';
import { z } from 'zod';

const input = z.object({ id: z.string(), performBackup: z.boolean().default(true) });

/**
 * Given an app id, updates the app to the latest version
 */
export const updateAppAction = authActionClient.schema(input).action(async ({ parsedInput: { id, performBackup } }) => {
  const appLifecycle = getClass('IAppLifecycleService');
  await appLifecycle.executeCommand('updateApp', { appId: id, performBackup });

  revalidatePath('/apps');
  revalidatePath(`/app/${id}`);
  revalidatePath(`/app-store/${id}`);

  return { success: true };
});
