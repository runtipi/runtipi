'use server';

import { authActionClient } from '@/lib/safe-action';
import { revalidatePath } from 'next/cache';
import { getClass } from 'src/inversify.config';
import { z } from 'zod';

const schema = z.object({
  noPermissions: z.boolean().default(false),
  envFile: z.boolean().default(false),
  envFilePath: z.string(),
});

export const restartAction = authActionClient.schema(schema).action(async ({ parsedInput: { noPermissions, envFile, envFilePath } }) => {
  const systemService = getClass('ISystemService');
  const { success, message } = await systemService.restart(noPermissions, envFile, envFilePath);
  if (!success) {
    throw new Error(message);
  }
  revalidatePath('/');
  return { success: true };
});
