'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { appLifecycle } from '@/server/services/app-lifecycle/app-lifecycle.service';
import { authActionClient } from '@/lib/safe-action';

const formSchema = z.object({}).catchall(z.any());

const input = z.object({
  id: z.string(),
  form: formSchema,
});

/**
 * Given an app id, installs the app.
 */
export const installAppAction = authActionClient.schema(input).action(async ({ parsedInput: { id, form } }) => {
  await appLifecycle.executeCommand('installApp', { appId: id, form });

  revalidatePath('/apps');
  revalidatePath(`/app/${id}`);
  revalidatePath(`/app-store/${id}`);

  return { success: true };
});
