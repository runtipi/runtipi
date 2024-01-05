'use server';

import { z } from 'zod';
import { CustomLinksServiceClass } from '@/server/services/custom-links/custom-links.service';
import { db } from '@/server/db';
import { LinkInfo, linkSchema } from '@runtipi/shared';
import { action } from '@/lib/safe-action';
import { handleActionError } from '../utils/handle-action-error';

export const addLinkAction = action(linkSchema, async (link: LinkInfo) => {
  try {
    const linksService = new CustomLinksServiceClass(db);

    const linkResponse = await linksService.add(link);
    return { success: true, link: linkResponse };
  } catch (e) {
    return handleActionError(e);
  }
});

export const editLinkAction = action(linkSchema, async (link: LinkInfo) => {
  try {
    const linksService = new CustomLinksServiceClass(db);

    const linkResponse = await linksService.edit(link);
    return { success: true, link: linkResponse };
  } catch (e) {
    return handleActionError(e);
  }
});

export const deleteLinkAction = action(z.number(), async (linkId: number) => {
  try {
    const linksService = new CustomLinksServiceClass(db);

    await linksService.delete(linkId);
    return { success: true };
  } catch (e) {
    return handleActionError(e);
  }
});