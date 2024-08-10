'use server';

import { authActionClient } from '@/lib/safe-action';
import { appLifecycle } from '@/server/services/app-lifecycle/app-lifecycle.service';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const input = z.object({ id: z.string() });

/**
 * Given an app id, starts the app.
 */
export const startAppAction = authActionClient.schema(input).action(async ({ parsedInput: { id } }) => {
  await appLifecycle.executeCommand('startApp', { appId: id });

  revalidatePath('/apps');
  revalidatePath(`/app/${id}`);
  revalidatePath(`/app-store/${id}`);

  return { success: true };
});
