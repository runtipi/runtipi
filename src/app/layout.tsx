import React from 'react';
import type { Metadata } from 'next';
import { getLocale, getMessages } from 'next-intl/server';

import { cookies } from 'next/headers';
// eslint-disable-next-line import/no-unresolved
import { GeistSans } from 'geist/font/sans';
import { TipiConfig } from '@/server/core/TipiConfig';

import './global.css';
import clsx from 'clsx';
import { Toaster } from 'react-hot-toast';
import { ClientProviders } from './components/ClientProviders';
import { CookiesProvider } from 'next-client-cookies/server';
import { appCatalog } from '@/server/services/app-catalog/app-catalog.service';
import { AppStatus } from '@/server/db/schema';

export const metadata: Metadata = {
  title: 'Tipi',
  description: 'Tipi',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const messages = await getMessages();

  const clientSettings = TipiConfig.getSettings();

  const apps = await appCatalog.executeCommand('getInstalledApps');
  const appStatuses = apps.reduce(
    (acc, app) => {
      acc[app.id] = app.status;
      return acc;
    },
    {} as Record<string, AppStatus>,
  );

  const theme = cookies().get('theme');

  return (
    <html lang={locale} className={clsx(GeistSans.className, 'border-top-wide border-primary')}>
      <CookiesProvider>
        <ClientProviders messages={messages} locale={locale} initialTheme={theme?.value} appStatuses={appStatuses}>
          <body data-bs-theme={theme?.value}>
            <input type="hidden" value={JSON.stringify(clientSettings)} id="client-settings" />
            {children}
            <Toaster />
          </body>
        </ClientProviders>
      </CookiesProvider>
    </html>
  );
}
