'use server';

import { z } from 'zod';
import { action } from '@/lib/safe-action';
import { revalidatePath } from 'next/cache';
import { AppServiceClass } from '@/server/services/apps/apps.service';
import { handleActionError } from '../utils/handle-action-error';

const input = z.object({ id: z.string() });

/**
 * Given an app id, stops the app.
 */
export const stopAppAction = action(input, async ({ id }) => {
  try {
    const appsService = new AppServiceClass();
    await appsService.stopApp(id);

    return { success: true };
  } catch (e) {
    return await handleActionError(e);
  } finally {
    revalidatePath('/apps');
    revalidatePath(`/app/${id}`);
    revalidatePath(`/app-store/${id}`);
  }
});
