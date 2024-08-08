'use server';

import { linkSchema } from '@runtipi/shared';
import { authActionClient } from '@/lib/safe-action';
import { container } from 'src/inversify.config';
import type { ICustomLinksService } from '@/server/services/custom-links/custom-links.service';

export const editLinkAction = authActionClient.schema(linkSchema).action(async ({ parsedInput: link, ctx: { user } }) => {
  const linksService = container.get<ICustomLinksService>('ICustomLinksService');

  const linkResponse = await linksService.edit(link, user.id);
  return { success: true, link: linkResponse };
});
