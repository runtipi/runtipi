'use server';

import { authActionClient } from '@/lib/safe-action';
import { getClass } from 'src/inversify.config';
import { z } from 'zod';

export const deleteLinkAction = authActionClient.schema(z.number()).action(async ({ parsedInput: linkId, ctx: { user } }) => {
  const linksService = getClass('ICustomLinksService');

  await linksService.delete(linkId, user.id);
  return { success: true };
});
