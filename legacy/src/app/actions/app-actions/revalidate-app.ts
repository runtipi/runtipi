'use server';

import { authActionClient } from '@/lib/safe-action';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const input = z.object({ id: z.string() });

/**
 * Given an app id, revalidates the app and app store pages on demand.
 */
export const revalidateAppAction = authActionClient.schema(input).action(async ({ parsedInput: { id } }) => {
  revalidatePath('/apps');
  revalidatePath(`/app/${id}`);
  revalidatePath(`/app-store/${id}`);

  return { success: true };
});
