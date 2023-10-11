'use server';

import { z } from 'zod';
import { action } from '@/lib/safe-action';
import { getConfig } from '@/server/core/TipiConfig';
import { handleActionError } from '../utils/handle-action-error';

const input = z.object({ currentStatus: z.string() });

/**
 * Fetches the system status and compares it to the current status
 * If the status has changed, it will revalidate the whole app
 */
export const getStatusAction = action(input, async () => {
  try {
    const { status } = getConfig();

    return { success: true, status };
  } catch (e) {
    return handleActionError(e);
  }
});
