'use server';

import { action } from '@/lib/safe-action';
import { db } from '@/server/db';
import { AppServiceClass } from '@/server/services/apps/apps.service';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { handleActionError } from '../utils/handle-action-error';
import { ensureUser } from '../utils/ensure-user';

const input = z.object({
  id: z.string(),
});

export const resetAppAction = action(input, async ({ id }) => {
  try {
    await ensureUser();

    const appsService = new AppServiceClass(db);
    await appsService.resetApp(id);

    revalidatePath('/apps');
    revalidatePath(`/app/${id}`);
    revalidatePath(`/app-store/${id}`);

    return { success: true };
  } catch (e) {
    return handleActionError(e);
  }
});
