'use client';

import React, { startTransition, useOptimistic } from 'react';
import { useSocket } from '@/lib/socket/useSocket';
import { AppStatus } from '@/server/db/schema';
import { AppService } from '@/server/services/apps/apps.service';
import { useTranslations } from 'next-intl';
import toast from 'react-hot-toast';
import { useAction } from 'next-safe-action/hook';
import { revalidateAppAction } from '@/actions/app-actions/revalidate-app';
import { AppDetailsContainer } from './AppDetailsContainer';

interface IProps {
  app: Awaited<ReturnType<AppService['getApp']>>;
  localDomain?: string;
}

export const AppDetailsWrapper = (props: IProps) => {
  const { app, localDomain } = props;
  const t = useTranslations();
  const [optimisticStatus, setOptimisticStatus] = useOptimistic<AppStatus>(app.status);
  const revalidateAppMutation = useAction(revalidateAppAction);

  const changeStatus = (status: AppStatus) => {
    startTransition(() => {
      setOptimisticStatus(status);
    });
  };

  useSocket({
    onEvent: (event, data) => {
      if (data.error) {
        // eslint-disable-next-line no-console
        console.error(data.error);
      }

      switch (event) {
        case 'install_success':
          toast.success(t('apps.app-details.install-success'));
          changeStatus('running');
          break;
        case 'install_error':
          toast.error(t('server-messages.errors.app-failed-to-install', { id: app.id }));
          changeStatus('missing');
          break;
        case 'start_success':
          toast.success(t('apps.app-details.start-success'));
          changeStatus('running');
          break;
        case 'start_error':
          toast.error(t('server-messages.errors.app-failed-to-start', { id: app.id }));
          changeStatus('stopped');
          break;
        case 'stop_success':
          toast.success(t('apps.app-details.stop-success'));
          changeStatus('stopped');
          break;
        case 'stop_error':
          toast.error(t('server-messages.errors.app-failed-to-stop', { id: app.id }));
          changeStatus('running');
          break;
        case 'uninstall_success':
          toast.success(t('apps.app-details.uninstall-success'));
          changeStatus('missing');
          break;
        case 'uninstall_error':
          toast.error(t('server-messages.errors.app-failed-to-uninstall', { id: app.id }));
          changeStatus('stopped');
          break;
        case 'update_success':
          toast.success(t('apps.app-details.update-success'));
          changeStatus('running');
          break;
        case 'update_error':
          toast.error(t('server-messages.errors.app-failed-to-update', { id: app.id }));
          changeStatus('stopped');
          break;
        default:
          break;
      }

      revalidateAppMutation.execute({ id: app.id });
    },
    selector: { type: 'app', data: { property: 'appId', value: app.id } },
  });

  return <AppDetailsContainer localDomain={localDomain} app={app} optimisticStatus={optimisticStatus} setOptimisticStatus={setOptimisticStatus} />;
};
