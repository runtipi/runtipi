'use client';

import React from 'react';
import { AbstractIntlMessages, NextIntlClientProvider } from 'next-intl';
import { QueryClient, QueryClientProvider } from 'react-query';
import { ThemeProvider } from './ThemeProvider';
import { SocketProvider } from './SocketProvider/SocketProvider';

type Props = {
  children: React.ReactNode;
  initialTheme?: string;
  locale?: string;
  messages: AbstractIntlMessages;
};

const queryClient = new QueryClient({ defaultOptions: { queries: { refetchOnWindowFocus: false } } });

export const ClientProviders = ({ children, initialTheme, locale, messages }: Props) => {
  return (
    <QueryClientProvider client={queryClient}>
      <NextIntlClientProvider locale={locale} messages={messages} timeZone={Intl.DateTimeFormat().resolvedOptions().timeZone}>
        <SocketProvider>
          <ThemeProvider initialTheme={initialTheme}>{children}</ThemeProvider>
        </SocketProvider>
      </NextIntlClientProvider>
    </QueryClientProvider>
  );
};
