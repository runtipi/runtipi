'use server';

import { authActionClient } from '@/lib/safe-action';
import { revalidatePath } from 'next/cache';
import { getClass } from 'src/inversify.config';
import { z } from 'zod';

const formSchema = z.object({}).catchall(z.any());

const input = z.object({
  id: z.string(),
  form: formSchema,
});

/**
 * Given an app id, installs the app.
 */
export const installAppAction = authActionClient.schema(input).action(async ({ parsedInput: { id, form } }) => {
  const appLifecycle = getClass('IAppLifecycleService');
  await appLifecycle.executeCommand('installApp', { appId: id, form });

  revalidatePath('/apps');
  revalidatePath(`/app/${id}`);
  revalidatePath(`/app-store/${id}`);

  return { success: true };
});
