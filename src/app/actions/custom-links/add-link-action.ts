'use server';

import { CustomLinksServiceClass } from '@/server/services/custom-links/custom-links.service';
import { linkSchema } from '@runtipi/shared';
import { authActionClient } from '@/lib/safe-action';

export const addLinkAction = authActionClient.schema(linkSchema).action(async ({ parsedInput: link, ctx }) => {
  const linksService = new CustomLinksServiceClass();

  const linkResponse = await linksService.add(link, ctx.user.id);
  return { success: true, link: linkResponse };
});
