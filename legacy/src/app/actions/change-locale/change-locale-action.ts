'use server';

import { publicActionClient } from '@/lib/safe-action';
import { getLocaleFromString } from '@/shared/internationalization/locales';
import { cookies } from 'next/headers';
import { z } from 'zod';

const input = z.object({
  newLocale: z.string(),
});

export const changeLocaleAction = publicActionClient.schema(input).action(async ({ parsedInput: { newLocale } }) => {
  const locale = getLocaleFromString(newLocale);

  const cookieStore = cookies();
  cookieStore.set('tipi-locale', locale);

  return {
    success: true,
  };
});
