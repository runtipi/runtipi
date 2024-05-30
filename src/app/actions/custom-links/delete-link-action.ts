'use server';

import { action } from '@/lib/safe-action';
import { z } from 'zod';
import { CustomLinksServiceClass } from '@/server/services/custom-links/custom-links.service';
import { ensureUser } from '../utils/ensure-user';
import { handleActionError } from '../utils/handle-action-error';

export const deleteLinkAction = action(z.number(), async (linkId: number) => {
  try {
    const user = await ensureUser();

    const linksService = new CustomLinksServiceClass();

    await linksService.delete(linkId, user.id);
    return { success: true };
  } catch (e) {
    return handleActionError(e);
  }
});
