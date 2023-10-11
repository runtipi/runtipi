import React from 'react';
import type { Metadata } from 'next';

import { cookies } from 'next/headers';
import { Inter } from 'next/font/google';
import merge from 'lodash.merge';
import { NextIntlClientProvider } from 'next-intl';

import './global.css';
import clsx from 'clsx';
import { Toaster } from 'react-hot-toast';
import Head from 'next/head';
import { StatusProvider } from '@/components/hoc/StatusProvider';
import { getCurrentLocale } from '../utils/getCurrentLocale';
import { ClientProviders } from './components/ClientProviders';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
});

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

  return (
    <html lang={locale} className={clsx(inter.className, 'border-top-wide border-primary')}>
      <Head>
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="manifest" href="/site.webmanifest" />
        <link rel="mask-icon" href="/safari-pinned-tab.svg" color="#5bbad5" />
        <meta name="msapplication-TileColor" content="#da532c" />
        <meta name="theme-color" content="#ffffff" />
      </Head>
      <NextIntlClientProvider locale={locale} messages={mergedMessages}>
        <ClientProviders initialTheme={theme?.value} cookies={cookies().getAll()}>
          <body data-bs-theme={theme?.value}>
            <StatusProvider>{children}</StatusProvider>
            <Toaster />
          </body>
        </ClientProviders>
      </NextIntlClientProvider>
    </html>
  );
}
