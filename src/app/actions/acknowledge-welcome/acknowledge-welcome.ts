'use server';

import { z } from 'zod';
import { action } from '@/lib/safe-action';
import { revalidatePath } from 'next/cache';
import { SystemServiceClass } from '@/server/services/system';
import { getSettings, setSettings } from '@/server/core/TipiConfig';
import { handleActionError } from '../utils/handle-action-error';

const input = z.object({
  allowErrorMonitoring: z.boolean(),
});

export const acknowledgeWelcomeAction = action(input, async ({ allowErrorMonitoring }) => {
  try {
    await SystemServiceClass.markSeenWelcome();
    const settings = getSettings();

    await setSettings({ ...settings, allowErrorMonitoring });

    revalidatePath('/');

    return { success: true };
  } catch (e) {
    return handleActionError(e);
  }
});
