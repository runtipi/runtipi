'use server';

import { z } from 'zod';
import { action } from '@/lib/safe-action';
import { getUserFromCookie } from '@/server/common/session.helpers';
import { SystemServiceClass } from '@/server/services/system';
import { revalidatePath } from 'next/cache';
import { handleActionError } from '../utils/handle-action-error';

const input = z.void();

/**
 * Restarts the system
 */
export const restartAction = action(input, async () => {
  try {
    const user = await getUserFromCookie();

    if (!user?.operator) {
      throw new Error('Not authorized');
    }

    const systemService = new SystemServiceClass();
    await systemService.restart();

    revalidatePath('/');

    return { success: true };
  } catch (e) {
    return handleActionError(e);
  }
});
