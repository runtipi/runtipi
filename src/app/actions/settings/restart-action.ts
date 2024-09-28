'use server';

import { authActionClient } from '@/lib/safe-action';
import { revalidatePath } from 'next/cache';
import { getClass } from 'src/inversify.config';
import { z } from 'zod';

export const restartAction = authActionClient.schema(z.void()).action(async () => {
  const systemService = getClass('ISystemService');
  const { success, message } = await systemService.restart();
  if (!success) {
    throw new Error(message);
  }
  revalidatePath('/');
  return { success: true };
});
