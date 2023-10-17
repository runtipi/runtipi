'use server';

import { action } from '@/lib/safe-action';
import { getUserFromCookie } from '@/server/common/session.helpers';
import { settingsSchema } from '@runtipi/shared';
import { setSettings } from '@/server/core/TipiConfig';
import { handleActionError } from '../utils/handle-action-error';

/**
 * Given a settings object, update the settings.json file
 */
export const updateSettingsAction = action(settingsSchema, async (settings) => {
  try {
    const user = await getUserFromCookie();

    if (!user?.operator) {
      throw new Error('Not authorized');
    }

    await setSettings(settings);

    return { success: true };
  } catch (e) {
    return handleActionError(e);
  }
});
