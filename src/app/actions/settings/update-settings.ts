'use server';

import { action } from '@/lib/safe-action';
import { settingsSchema } from '@runtipi/shared';
import { setSettings } from '@/server/core/TipiConfig';
import { revalidatePath } from 'next/cache';
import { handleActionError } from '../utils/handle-action-error';
import { ensureUser } from '../utils/ensure-user';

/**
 * Given a settings object, update the settings.json file
 */
export const updateSettingsAction = action(settingsSchema, async (settings) => {
  try {
    const { operator } = await ensureUser();

    if (!operator) {
      throw new Error('Not authorized');
    }

    await setSettings(settings);

    revalidatePath('/');

    return { success: true };
  } catch (e) {
    return handleActionError(e);
  }
});
