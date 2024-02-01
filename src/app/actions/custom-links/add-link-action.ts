'use server';

import { CustomLinksServiceClass } from '@/server/services/custom-links/custom-links.service';
import { LinkInfo, linkSchema } from '@runtipi/shared';
import { action } from '@/lib/safe-action';
import { handleActionError } from '../utils/handle-action-error';
import { ensureUser } from '../utils/ensure-user';

export const addLinkAction = action(linkSchema, async (link: LinkInfo) => {
  try {
    const user = await ensureUser();

    const linksService = new CustomLinksServiceClass();

    const linkResponse = await linksService.add(link, user.id);
    return { success: true, link: linkResponse };
  } catch (e) {
    return handleActionError(e);
  }
});
