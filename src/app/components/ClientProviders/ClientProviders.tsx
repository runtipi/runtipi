'use client';

import React from 'react';
import { AbstractIntlMessages, NextIntlClientProvider } from 'next-intl';
import { QueryClient, QueryClientProvider } from 'react-query';
import { ThemeProvider } from './ThemeProvider';
import { SocketProvider } from './SocketProvider/SocketProvider';
import type { AppStatus } from '@/server/db/schema';
import { AppStatusStoreProvider } from './AppStatusProvider/app-status-provider';

type Props = {
  children: React.ReactNode;
  initialTheme?: string;
  locale?: string;
  messages: AbstractIntlMessages;
  appStatuses: Record<string, AppStatus>;
};

const queryClient = new QueryClient({ defaultOptions: { queries: { refetchOnWindowFocus: false } } });

export const ClientProviders = ({ children, initialTheme, locale, messages, appStatuses }: Props) => {
  return (
    <QueryClientProvider client={queryClient}>
      <NextIntlClientProvider locale={locale} messages={messages} timeZone={Intl.DateTimeFormat().resolvedOptions().timeZone}>
        <AppStatusStoreProvider initialStatuses={appStatuses}>
          <SocketProvider>
            <ThemeProvider initialTheme={initialTheme}>{children}</ThemeProvider>
          </SocketProvider>
        </AppStatusStoreProvider>
      </NextIntlClientProvider>
    </QueryClientProvider>
  );
};
