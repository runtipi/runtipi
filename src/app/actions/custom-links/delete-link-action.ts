'use server';

import { authActionClient } from '@/lib/safe-action';
import { z } from 'zod';
import { CustomLinksServiceClass } from '@/server/services/custom-links/custom-links.service';

export const deleteLinkAction = authActionClient.schema(z.number()).action(async ({ parsedInput: linkId, ctx: { user } }) => {
  const linksService = new CustomLinksServiceClass();

  await linksService.delete(linkId, user.id);
  return { success: true };
});
