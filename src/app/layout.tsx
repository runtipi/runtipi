import React from 'react';
import type { Metadata } from 'next';

import { Inter } from 'next/font/google';
import { cookies, headers } from 'next/headers';
import { getLocaleFromString } from '@/shared/internationalization/locales';
import merge from 'lodash.merge';
import { NextIntlClientProvider } from 'next-intl';

import './global.css';
import clsx from 'clsx';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Tipi',
  description: 'Tipi',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = cookies();
  const cookieLocale = cookieStore.get('tipi-locale');

  const headersList = headers();
  const browserLocale = headersList.get('accept-language');

  const locale = getLocaleFromString(String(cookieLocale?.value || browserLocale || 'en'));

  const englishMessages = (await import(`../client/messages/en.json`)).default;
  const messages = (await import(`../client/messages/${locale}.json`)).default;
  const mergedMessages = merge(englishMessages, messages);

  return (
    <html lang={locale} className={clsx(inter.className, 'border-top-wide border-primary')}>
      <NextIntlClientProvider locale={locale} messages={mergedMessages}>
        <body>{children}</body>
      </NextIntlClientProvider>
    </html>
  );
}
