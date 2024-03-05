'use client';

import React, { ComponentProps } from 'react';
import { CookiesProvider } from 'next-client-cookies';
import { AbstractIntlMessages, NextIntlClientProvider } from 'next-intl';
import { QueryClient, QueryClientProvider } from 'react-query';
import { ThemeProvider } from './ThemeProvider';
import { SocketProvider } from './SocketProvider/SocketProvider';

type Props = {
  children: React.ReactNode;
  cookies: ComponentProps<typeof CookiesProvider>['value'];
  initialTheme?: string;
  locale?: string;
  messages: AbstractIntlMessages;
};

const queryClient = new QueryClient({ defaultOptions: { queries: { refetchOnWindowFocus: false } } });

export const ClientProviders = ({ children, initialTheme, cookies, locale, messages }: Props) => {
  return (
    <QueryClientProvider client={queryClient}>
      <NextIntlClientProvider locale={locale} messages={messages} timeZone={Intl.DateTimeFormat().resolvedOptions().timeZone}>
        <SocketProvider>
          <CookiesProvider value={cookies}>
            <ThemeProvider initialTheme={initialTheme}>{children}</ThemeProvider>
          </CookiesProvider>
        </SocketProvider>
      </NextIntlClientProvider>
    </QueryClientProvider>
  );
};

export const ClientCookiesProvider: typeof CookiesProvider = (props) => <CookiesProvider {...props} />;
