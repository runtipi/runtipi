'use server';

import { z } from 'zod';
import { action } from '@/lib/safe-action';
import { getUserFromCookie } from '@/server/common/session.helpers';
import { settingsSchema } from '@runtipi/shared';
import { setSettings } from '@/server/core/TipiConfig';
import { handleActionError } from '../utils/handle-action-error';

/**
 * Given a settings object, update the settings.json file
 */
export const updateSettingsAction = action(settingsSchema, async () => {
  try {
    const user = await getUserFromCookie();

    if (!user?.operator) {
      throw new Error('Not authorized');
    }

    await setSettings(settingsSchema as z.infer<typeof settingsSchema>);

    return { success: true };
  } catch (e) {
    return handleActionError(e);
  }
});
