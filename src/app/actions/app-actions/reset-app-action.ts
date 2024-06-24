'use server';

import { appLifecycle } from '@/server/services/app-lifecycle/app-lifecycle.service';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { authActionClient } from '@/lib/safe-action';

const input = z.object({
  id: z.string(),
});

export const resetAppAction = authActionClient.schema(input).action(async ({ parsedInput: { id } }) => {
  await appLifecycle.executeCommand('resetApp', { appId: id });

  revalidatePath('/apps');
  revalidatePath(`/app/${id}`);
  revalidatePath(`/app-store/${id}`);

  return { success: true };
});
