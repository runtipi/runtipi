import React from 'react';
import type { Metadata } from 'next';

import { cookies } from 'next/headers';
import { GeistSans } from 'geist/font/sans';
import merge from 'lodash.merge';
import { NextIntlClientProvider } from 'next-intl';
import { getConfig } from '@/server/core/TipiConfig';

import './global.css';
import clsx from 'clsx';
import { Toaster } from 'react-hot-toast';
import { getCurrentLocale } from '../utils/getCurrentLocale';
import { ClientProviders } from './components/ClientProviders';

export const metadata: Metadata = {
  title: 'Tipi',
  description: 'Tipi',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = getCurrentLocale();

  const englishMessages = (await import(`../client/messages/en.json`)).default;
  const messages = (await import(`../client/messages/${locale}.json`)).default;
  const mergedMessages = merge(englishMessages, messages);

  const theme = cookies().get('theme');

  const { allowAutoThemes } = getConfig();

  return (
    <html lang={locale} className={clsx(GeistSans.className, 'border-top-wide border-primary')}>
      <NextIntlClientProvider locale={locale} messages={mergedMessages}>
        <ClientProviders initialTheme={theme?.value} cookies={cookies().getAll()} allowAutoThemes={allowAutoThemes}>
          <body data-bs-theme={theme?.value}>
            {children}
            <Toaster />
          </body>
        </ClientProviders>
      </NextIntlClientProvider>
    </html>
  );
}
