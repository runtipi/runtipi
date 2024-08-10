'use server';

import { authActionClient } from '@/lib/safe-action';
import { TipiConfig } from '@/server/core/TipiConfig';
import { settingsSchema } from '@runtipi/shared';
import { revalidatePath } from 'next/cache';

/**
 * Given a settings object, update the settings.json file
 */
export const updateSettingsAction = authActionClient.schema(settingsSchema).action(async ({ parsedInput: settings, ctx: { user } }) => {
  if (!user.operator) {
    throw new Error('Not authorized');
  }

  await TipiConfig.setSettings(settings);

  revalidatePath('/');

  return { success: true };
});
