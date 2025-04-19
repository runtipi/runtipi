import { useSSE } from '@/lib/hooks/use-sse';
import type { AppUrn } from '@/types/app.types';
import { extractAppUrn } from '@/utils/app-helpers';
import { useQueryClient } from '@tanstack/react-query';
import type { PropsWithChildren } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

export const SSEProvider = ({ children }: PropsWithChildren) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  useSSE({
    topic: 'app',
    onEvent: ({ event, appUrn, error }) => {
      if (error) {
        console.error(error);
      }

      const { appName } = extractAppUrn(appUrn as AppUrn);

      queryClient.invalidateQueries();

      switch (event) {
        case 'status_change':
          break;
        case 'install_success':
          toast.success(t('APP_INSTALL_SUCCESS', { id: appName }));
          break;
        case 'install_error':
          toast.error(t('APP_ERROR_APP_FAILED_TO_INSTALL', { id: appName }));
          break;
        case 'start_success':
          toast.success(t('APP_START_SUCCESS', { id: appName }));
          break;
        case 'start_error':
          toast.error(t('APP_ERROR_APP_FAILED_TO_START', { id: appName }));
          break;
        case 'stop_success':
          toast.success(t('APP_STOP_SUCCESS', { id: appName }));
          break;
        case 'stop_error':
          toast.error(t('APP_ERROR_APP_FAILED_TO_STOP', { id: appName }));
          break;
        case 'uninstall_success':
          toast.success(t('APP_UNINSTALL_SUCCESS', { id: appName }));
          break;
        case 'uninstall_error':
          toast.error(t('APP_ERROR_APP_FAILED_TO_UNINSTALL', { id: appName }));
          break;
        case 'update_success':
          toast.success(t('APP_UPDATE_SUCCESS', { id: appName }));
          break;
        case 'update_error':
          toast.error(t('APP_ERROR_APP_FAILED_TO_UPDATE', { id: appName }));
          break;
        case 'reset_success':
          toast.success(t('APP_RESET_SUCCESS', { id: appName }));
          break;
        case 'reset_error':
          toast.error(t('APP_ERROR_APP_FAILED_TO_RESET', { id: appName }));
          break;
        case 'restart_success':
          toast.success(t('APP_RESTART_SUCCESS', { id: appName }));
          break;
        case 'restart_error':
          toast.error(t('APP_ERROR_APP_FAILED_TO_RESTART', { id: appName }));
          break;
        case 'backup_success':
          toast.success(t('APP_BACKUP_SUCCESS', { id: appName }));
          break;
        case 'backup_error':
          toast.error(t('APP_BACKUP_ERROR', { id: appName }));
          break;
        case 'restore_success':
          toast.success(t('APP_RESTORE_SUCCESS', { id: appName }));
          break;
        case 'restore_error':
          toast.error(t('APP_RESTORE_ERROR', { id: appName }));
          break;
        default:
          break;
      }
    },
  });

  return children;
};
