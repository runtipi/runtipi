'use server';

import { authActionClient } from '@/lib/safe-action';
import type { ICustomLinksService } from '@/server/services/custom-links/custom-links.service';
import { linkSchema } from '@runtipi/shared';
import { container } from 'src/inversify.config';

export const addLinkAction = authActionClient.schema(linkSchema).action(async ({ parsedInput: link, ctx }) => {
  const linksService = container.get<ICustomLinksService>('ICustomLinksService');

  const linkResponse = await linksService.add(link, ctx.user.id);
  return { success: true, link: linkResponse };
});
