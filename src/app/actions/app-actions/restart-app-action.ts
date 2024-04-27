'use server';

import { z } from 'zod';
import { action } from '@/lib/safe-action';
import { revalidatePath } from 'next/cache';
import { appService } from '@/server/services/apps/apps.service';
import { handleActionError } from '../utils/handle-action-error';
import { ensureUser } from '../utils/ensure-user';

const input = z.object({ id: z.string() });

/**
 * Given an app id, restarts the app.
 */
export const restartAppAction = action(input, async ({ id }) => {
  try {
    await ensureUser();

    await appService.restartApp(id);

    revalidatePath('/apps');
    revalidatePath(`/app/${id}`);
    revalidatePath(`/app-store/${id}`);

    return { success: true };
  } catch (e) {
    return handleActionError(e);
  }
});
