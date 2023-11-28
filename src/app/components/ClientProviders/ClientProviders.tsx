'use client';

import React, { ComponentProps } from 'react';
import { CookiesProvider } from 'next-client-cookies';
import { ThemeProvider } from './ThemeProvider';

type Props = {
  children: React.ReactNode;
  cookies: ComponentProps<typeof CookiesProvider>['value'];
  initialTheme?: string;
  allowAutoThemes: boolean;
};

export const ClientProviders = ({ children, initialTheme, cookies, allowAutoThemes }: Props) => {
  return (
    <CookiesProvider value={cookies}>
      <ThemeProvider allowAutoThemes={allowAutoThemes} initialTheme={initialTheme}>
        {children}
      </ThemeProvider>
    </CookiesProvider>
  );
};

export const ClientCookiesProvider: typeof CookiesProvider = (props) => <CookiesProvider {...props} />;
