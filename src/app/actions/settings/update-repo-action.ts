'use server';

import { authActionClient } from '@/lib/safe-action';
import { getClass } from 'src/inversify.config';
import { z } from 'zod';

export const updateRepoAction = authActionClient.schema(z.void()).action(async () => {
  const systemService = getClass('ISystemService');
  await systemService.updateRepos();
  return { success: true };
});
