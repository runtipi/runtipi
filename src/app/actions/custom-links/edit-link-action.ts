'use server';

import { linkSchema } from '@runtipi/shared';
import { CustomLinksServiceClass } from '@/server/services/custom-links/custom-links.service';
import { authActionClient } from '@/lib/safe-action';

export const editLinkAction = authActionClient.schema(linkSchema).action(async ({ parsedInput: link, ctx: { user } }) => {
  const linksService = new CustomLinksServiceClass();

  const linkResponse = await linksService.edit(link, user.id);
  return { success: true, link: linkResponse };
});
