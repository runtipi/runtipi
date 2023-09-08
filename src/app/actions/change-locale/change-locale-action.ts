'use server';

import { z } from 'zod';
import { getLocaleFromString } from '@/shared/internationalization/locales';
import { cookies } from 'next/headers';
import { action } from '@/lib/safe-action';

const input = z.object({
  newLocale: z.string(),
});

export const changeLocaleAction = action(input, async ({ newLocale }) => {
  const locale = getLocaleFromString(newLocale);

  const cookieStore = cookies();
  cookieStore.set('tipi-locale', locale);

  return {
    success: true,
  };
});
