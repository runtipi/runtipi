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
});

/**
 * Given an app id, installs the app.
 */
export const installAppAction = action(input, async ({ id, form }) => {
  try {
    const appsService = new AppServiceClass();
    await appsService.installApp(id, form);

    return { success: true };
  } catch (e) {
    return await handleActionError(e);
  } finally {
    revalidatePath('/apps');
    revalidatePath(`/app/${id}`);
    revalidatePath(`/app-store/${id}`);
  }
});
