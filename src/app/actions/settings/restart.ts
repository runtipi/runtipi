'use server';

import { action } from '@/lib/safe-action';
import { handleActionError } from '../utils/handle-action-error';
import { z } from 'zod';
import { ensureUser } from '../utils/ensure-user';
import { systemService } from '@/server/services/system/system.service';

export const restartAction = action(z.void(), async () => {
  try {
    await ensureUser();

    await systemService.restart();

    return { success: true };
  } catch (e) {
    handleActionError(e);
  }
});
