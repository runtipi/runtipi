import React from 'react';
import type { Metadata } from 'next';

import { cookies } from 'next/headers';
import { GeistSans } from 'geist/font/sans';
import merge from 'lodash.merge';
import { NextIntlClientProvider } from 'next-intl';
import { getSettings } from '@/server/core/TipiConfig';

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

  const clientSettings = getSettings();

  const englishMessages = (await import(`../client/messages/en.json`)).default;
  const messages = (await import(`../client/messages/${locale}.json`)).default;
  const mergedMessages = merge(englishMessages, messages);

  const theme = cookies().get('theme');

  return (
    <html lang={locale} className={clsx(GeistSans.className, 'border-top-wide border-primary')}>
      <NextIntlClientProvider locale={locale} messages={mergedMessages}>
        <ClientProviders initialTheme={theme?.value} cookies={cookies().getAll()}>
          <body data-bs-theme={theme?.value}>
            <input type="hidden" value={JSON.stringify(clientSettings)} id="client-settings" />
            {children}
            <Toaster />
          </body>
        </ClientProviders>
      </NextIntlClientProvider>
    </html>
  );
}
