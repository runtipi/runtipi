'use server';

import { z } from 'zod';
import { getLocaleFromString } from '@/shared/internationalization/locales';
import { cookies } from 'next/headers';
import { publicActionClient } from '@/lib/safe-action';

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
