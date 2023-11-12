'use server';

import { z } from 'zod';
import { action } from '@/lib/safe-action';
import { revalidatePath } from 'next/cache';
import { AppServiceClass } from '@/server/services/apps/apps.service';
import { handleActionError } from '../utils/handle-action-error';

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
export const updateAppConfigAction = action(input, async ({ id, form }) => {
  try {
    const appsService = new AppServiceClass();
    await appsService.updateAppConfig(id, form);

    return { success: true };
  } catch (e) {
    return await handleActionError(e);
  } finally {
    revalidatePath('/apps');
    revalidatePath(`/app/${id}`);
    revalidatePath(`/app-store/${id}`);
  }
});
