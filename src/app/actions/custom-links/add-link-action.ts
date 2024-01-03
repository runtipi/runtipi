'use server';

import { z } from 'zod';
import { action } from '@/lib/safe-action';
import { CustomLinksServiceClass } from '@/server/services/custom-links/custom-links.service';
import { db } from '@/server/db';
import { LinkInfo } from '@runtipi/shared';
import { ensureUser } from '../utils/ensure-user';
import { handleActionError } from '../utils/handle-action-error';

const input = z.object({
  title: z.string().min(1).max(20),
  url: z.string().url(),
  iconURL: z.string().url().or(z.literal("")),
});

export const addLinkAction = action(input, async ({title, url, iconURL}) => {
  try {
    const user = await ensureUser();

    const link: LinkInfo = { title, url, iconURL, userId: user.id };

    const linksService = new CustomLinksServiceClass(db);
    await linksService.add(link);
    return { success: true };
  } catch (e) {
    return handleActionError(e);
  }
});