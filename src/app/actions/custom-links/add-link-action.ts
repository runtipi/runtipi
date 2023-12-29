'use server';

import { z } from 'zod';
import { action } from '@/lib/safe-action';
import { CustomLinksServiceClass } from '@/server/services/custom-links/custom-links.service';
import { db } from '@/server/db';
import { ensureUser } from '../utils/ensure-user';
import { handleActionError } from '../utils/handle-action-error';

const input = z.object({
  title: z.string(),
  url: z.string().url(),
});

export const addLinkAction = action(input, async ({title, url}) => {
  try {
    const user = await ensureUser();

    const linksService = new CustomLinksServiceClass(db);
    await linksService.add(title, url, user.id);
    return { success: true };
  } catch (e) {
    return handleActionError(e);
  }
});