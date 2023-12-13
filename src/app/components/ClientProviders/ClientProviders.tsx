'use client';

import React, { ComponentProps } from 'react';
import { CookiesProvider } from 'next-client-cookies';
import { useSocket } from '@/lib/socket/useSocket';
import { useAction } from 'next-safe-action/hook';
import { revalidateAppAction } from '@/actions/app-actions/revalidate-app';
import { useTranslations } from 'next-intl';
import toast from 'react-hot-toast';
import { ThemeProvider } from './ThemeProvider';

type Props = {
  children: React.ReactNode;
  cookies: ComponentProps<typeof CookiesProvider>['value'];
  initialTheme?: string;
};

export const ClientProviders = ({ children, initialTheme, cookies }: Props) => {
  const revalidateAppMutation = useAction(revalidateAppAction);
  const t = useTranslations();

  useSocket({
    onEvent: (event, data) => {
      revalidateAppMutation.execute({ id: data.appId });

      switch (event) {
        case 'install_success':
          toast.success(t('apps.app-details.install-success'));
          break;
        case 'install_error':
          toast.error(t('server-messages.errors.app-failed-to-install', { id: data.appId }));
          break;
        case 'start_success':
          toast.success(t('apps.app-details.start-success'));
          break;
        case 'start_error':
          toast.error(t('server-messages.errors.app-failed-to-start', { id: data.appId }));
          break;
        case 'stop_success':
          toast.success(t('apps.app-details.stop-success'));
          break;
        case 'stop_error':
          toast.error(t('server-messages.errors.app-failed-to-stop', { id: data.appId }));
          break;
        case 'uninstall_success':
          toast.success(t('apps.app-details.uninstall-success'));
          break;
        case 'uninstall_error':
          toast.error(t('server-messages.errors.app-failed-to-uninstall', { id: data.appId }));
          break;
        case 'update_success':
          toast.success(t('apps.app-details.update-success'));
          break;
        case 'update_error':
          toast.error(t('server-messages.errors.app-failed-to-update', { id: data.appId }));
          break;
        default:
          break;
      }
    },
    selector: { type: 'app' },
  });

  return (
    <CookiesProvider value={cookies}>
      <ThemeProvider initialTheme={initialTheme}>{children}</ThemeProvider>
    </CookiesProvider>
  );
};

export const ClientCookiesProvider: typeof CookiesProvider = (props) => <CookiesProvider {...props} />;
