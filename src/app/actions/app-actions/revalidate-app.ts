'use server';

import { z } from 'zod';
import { action } from '@/lib/safe-action';
import { revalidatePath } from 'next/cache';
import { handleActionError } from '../utils/handle-action-error';

const input = z.object({ id: z.string() });

/**
 * Given an app id, revalidates the app and app store pages on demand.
 */
export const revalidateAppAction = action(input, async ({ id }) => {
  try {
    revalidatePath('/apps');
    revalidatePath(`/app/${id}`);
    revalidatePath(`/app-store/${id}`);

    return { success: true };
  } catch (e) {
    return handleActionError(e);
  }
});
