'use server';

import { action } from '@/lib/safe-action';
import { linkSchema, LinkInfo } from '@runtipi/shared';
import { CustomLinksServiceClass } from '@/server/services/custom-links/custom-links.service';
import { ensureUser } from '../utils/ensure-user';
import { handleActionError } from '../utils/handle-action-error';

export const editLinkAction = action(linkSchema, async (link: LinkInfo) => {
  try {
    const user = await ensureUser();

    const linksService = new CustomLinksServiceClass();

    const linkResponse = await linksService.edit(link, user.id);
    return { success: true, link: linkResponse };
  } catch (e) {
    return handleActionError(e);
  }
});
