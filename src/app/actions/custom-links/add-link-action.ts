'use server';

import { z } from 'zod';
import { action } from '@/lib/safe-action';

const input = z.object({
  title: z.string(),
  url: z.string().url(),
});

export const addLinkAction = action(input, async ({title, url}) => {

  console.log('addLinkAction ', title, url);
});