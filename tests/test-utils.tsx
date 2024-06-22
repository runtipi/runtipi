import React, { FC, ReactElement } from 'react';
import { render, RenderOptions, renderHook } from '@testing-library/react';
import { Toaster } from 'react-hot-toast';
import { IntlProvider } from 'next-intl';
import ue from '@testing-library/user-event';
import messages from '../src/client/messages/en.json';
import { AppStatusStoreProvider } from 'src/app/components/ClientProviders/AppStatusProvider/app-status-provider';

const userEvent = ue.setup();

const AllTheProviders: FC<{ children: React.ReactNode }> = ({ children }) => (
  <IntlProvider locale="en" messages={messages}>
    <AppStatusStoreProvider initialStatuses={{}}>{children}</AppStatusStoreProvider>
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
