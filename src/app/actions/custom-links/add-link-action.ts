'use server';

import { action } from '@/lib/safe-action';
import { CustomLinksServiceClass } from '@/server/services/custom-links/custom-links.service';
import { db } from '@/server/db';
import { LinkInfo, linkSchema } from '@runtipi/shared';
import { handleActionError } from '../utils/handle-action-error';

export const addLinkAction = action(linkSchema, async ({title, url, iconURL}) => {
  try {
    const link: LinkInfo = { title, url, iconURL};

    const linksService = new CustomLinksServiceClass(db);
    await linksService.add(link);
    return { success: true };
  } catch (e) {
    return handleActionError(e);
  }
});