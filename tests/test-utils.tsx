import 'reflect-metadata';
import { type RenderOptions, render, renderHook } from '@testing-library/react';
import ue from '@testing-library/user-event';
import { IntlProvider } from 'next-intl';
import type React from 'react';
import type { FC, ReactElement } from 'react';
import { Toaster } from 'react-hot-toast';
import { AppStatusStoreProvider } from 'src/app/components/ClientProviders/AppStatusProvider/app-status-provider';
import { ClientSettingsStoreProvider } from 'src/app/components/ClientProviders/ClientSettingsProvider/ClientSettingsProvider';
import messages from '../src/client/messages/en.json';

const userEvent = ue.setup();

const AllTheProviders: FC<{ children: React.ReactNode }> = ({ children }) => (
  <IntlProvider locale="en" messages={messages}>
    <ClientSettingsStoreProvider initialSettings={{}}>
      <AppStatusStoreProvider initialStatuses={{}}>{children}</AppStatusStoreProvider>
    </ClientSettingsStoreProvider>
    <Toaster />
  </IntlProvider>
);

const customRender = (ui: ReactElement, options?: Omit<RenderOptions, 'wrapper'>) => render(ui, { wrapper: AllTheProviders, ...options });
const customRenderHook = <Props, Result>(callback: (props: Props) => Result, options?: Omit<RenderOptions, 'wrapper'>) =>
  renderHook(callback, { wrapper: AllTheProviders, ...options });

export * from '@testing-library/react';
export { customRender as render };
export { customRenderHook as renderHook };
export { userEvent };
