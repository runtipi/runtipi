'use server';

import { authActionClient } from '@/lib/safe-action';
import type { ICustomLinksService } from '@/server/services/custom-links/custom-links.service';
import { container } from 'src/inversify.config';
import { z } from 'zod';

export const deleteLinkAction = authActionClient.schema(z.number()).action(async ({ parsedInput: linkId, ctx: { user } }) => {
  const linksService = container.get<ICustomLinksService>('ICustomLinksService');

  await linksService.delete(linkId, user.id);
  return { success: true };
});
