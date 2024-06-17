'use server';

import { z } from 'zod';
import { action } from '@/lib/safe-action';
import { revalidatePath } from 'next/cache';
import { appLifecycle } from '@/server/services/app-lifecycle/app-lifecycle.service';
import { handleActionError } from '../utils/handle-action-error';
import { ensureUser } from '../utils/ensure-user';

const input = z.object({
  id: z.string(),
});

/**
 * Given an app id, backs up the app.
 */
export const restoreAppAction = action(input, async ({ id }) => {
  try {
    await ensureUser();

    await appLifecycle.executeCommand('restoreApp', { appId: id });

    revalidatePath('/apps');
    revalidatePath(`/app/${id}`);
    revalidatePath(`/app-store/${id}`);

    return { success: true };
  } catch (e) {
    return handleActionError(e);
  }
});
