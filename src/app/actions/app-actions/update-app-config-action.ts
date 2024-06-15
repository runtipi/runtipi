'use server';

import { z } from 'zod';
import { action } from '@/lib/safe-action';
import { revalidatePath } from 'next/cache';
import { appLifecycle } from '@/server/services/app-lifecycle/app-lifecycle.service';
import { handleActionError } from '../utils/handle-action-error';
import { ensureUser } from '../utils/ensure-user';

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
    await ensureUser();

    await appLifecycle.executeCommand('updateAppConfig', { appId: id, form });

    revalidatePath('/apps');
    revalidatePath(`/app/${id}`);
    revalidatePath(`/app-store/${id}`);

    return { success: true };
  } catch (e) {
    return handleActionError(e);
  }
});
