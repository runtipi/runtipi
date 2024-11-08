'use server';

import { authActionClient } from '@/lib/safe-action';
import { revalidatePath } from 'next/cache';
import { getClass } from 'src/inversify.config';
import { z } from 'zod';

const formSchema = z.object({}).catchall(z.any());

const input = z.object({
  id: z.string(),
  form: formSchema,
  exposed: z.boolean().optional(),
  domain: z.string().optional(),
});

/**
 * Given an app id and form, updates the app config
 */
export const updateAppConfigAction = authActionClient.schema(input).action(async ({ parsedInput: { id, form } }) => {
  const appLifecycle = getClass('IAppLifecycleService');
  await appLifecycle.executeCommand('updateAppConfig', { appId: id, form });

  revalidatePath('/apps');
  revalidatePath(`/app/${id}`);
  revalidatePath(`/app-store/${id}`);

  return { success: true };
});
