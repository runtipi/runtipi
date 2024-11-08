'use server';

import { authActionClient } from '@/lib/safe-action';
import { linkSchema } from '@runtipi/shared';
import { getClass } from 'src/inversify.config';

export const addLinkAction = authActionClient.schema(linkSchema).action(async ({ parsedInput: link, ctx }) => {
  const linksService = getClass('ICustomLinksService');

  const linkResponse = await linksService.add(link, ctx.user.id);
  return { success: true, link: linkResponse };
});
