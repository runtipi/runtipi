'use server';

import { authActionClient } from '@/lib/safe-action';
import { TipiConfig } from '@/server/core/TipiConfig';
import { SystemServiceClass } from '@/server/services/system';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const input = z.object({
  allowErrorMonitoring: z.boolean(),
});

export const acknowledgeWelcomeAction = authActionClient.schema(input).action(async ({ parsedInput: { allowErrorMonitoring } }) => {
  await SystemServiceClass.markSeenWelcome();
  const settings = TipiConfig.getSettings();

  await TipiConfig.setSettings({ ...settings, allowErrorMonitoring });

  revalidatePath('/');

  return { success: true };
});
