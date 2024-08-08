'use server';

import { linkSchema } from '@runtipi/shared';
import { authActionClient } from '@/lib/safe-action';
import { container } from 'src/inversify.config';
import type { ICustomLinksService } from '@/server/services/custom-links/custom-links.service';

export const addLinkAction = authActionClient.schema(linkSchema).action(async ({ parsedInput: link, ctx }) => {
  const linksService = container.get<ICustomLinksService>('ICustomLinksService');

  const linkResponse = await linksService.add(link, ctx.user.id);
  return { success: true, link: linkResponse };
});
