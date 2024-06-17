'use client';

import React, { startTransition, useOptimistic } from 'react';
import { useSocket } from '@/lib/socket/useSocket';
import { AppStatus } from '@/server/db/schema';
import { AppDetailsContainer } from './AppDetailsContainer';
import { GetAppCommand } from '@/server/services/app-catalog/commands';

interface IProps {
  app: Awaited<ReturnType<GetAppCommand['execute']>>;
  backups: string[];
  localDomain?: string;
}

export const AppDetailsWrapper = (props: IProps) => {
  const { app, localDomain, backups } = props;
  const [optimisticStatus, setOptimisticStatus] = useOptimistic<AppStatus>(app.status);

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
          changeStatus('running');
          break;
        case 'install_error':
          changeStatus('missing');
          break;
        case 'start_success':
          changeStatus('running');
          break;
        case 'start_error':
          changeStatus('stopped');
          break;
        case 'stop_success':
          changeStatus('stopped');
          break;
        case 'stop_error':
          changeStatus('running');
          break;
        case 'restart_success':
          changeStatus('running');
          break;
        case 'restart_error':
          changeStatus('running');
          break;
        case 'uninstall_success':
          changeStatus('missing');
          break;
        case 'uninstall_error':
          changeStatus('stopped');
          break;
        case 'update_success':
          changeStatus('running');
          break;
        case 'update_error':
          changeStatus('stopped');
          break;
        case 'reset_success':
          changeStatus('running');
          break;
        case 'reset_error':
          changeStatus('stopped');
          break;
        case 'backup_success':
          changeStatus('running');
          break;
        case 'backup_error':
          changeStatus('stopped');
          break;
        case 'restore_success':
          changeStatus('running');
          break;
        case 'restore_error':
          changeStatus('stopped');
          break;
        default:
          break;
      }
    },
    selector: { type: 'app', data: { property: 'appId', value: app.id } },
  });

  return (
    <AppDetailsContainer
      localDomain={localDomain}
      app={app}
      backups={backups}
      optimisticStatus={optimisticStatus}
      setOptimisticStatus={setOptimisticStatus}
    />
  );
};
