'use server';

import { authActionClient } from '@/lib/safe-action';
import { linkSchema } from '@runtipi/shared';
import { getClass } from 'src/inversify.config';

export const editLinkAction = authActionClient.schema(linkSchema).action(async ({ parsedInput: link, ctx: { user } }) => {
  const linksService = getClass('ICustomLinksService');

  const linkResponse = await linksService.edit(link, user.id);
  return { success: true, link: linkResponse };
});
