import { useSSE } from '@/lib/hooks/use-sse';
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

      queryClient.invalidateQueries();

      switch (event) {
        case 'status_change':
          break;
        case 'install_success':
          toast.success(t('APP_INSTALL_SUCCESS', { id: appUrn }));
          break;
        case 'install_error':
          toast.error(t('APP_ERROR_APP_FAILED_TO_INSTALL', { id: appUrn }));
          break;
        case 'start_success':
          toast.success(t('APP_START_SUCCESS', { id: appUrn }));
          break;
        case 'start_error':
          toast.error(t('APP_ERROR_APP_FAILED_TO_START', { id: appUrn }));
          break;
        case 'stop_success':
          toast.success(t('APP_STOP_SUCCESS', { id: appUrn }));
          break;
        case 'stop_error':
          toast.error(t('APP_ERROR_APP_FAILED_TO_STOP', { id: appUrn }));
          break;
        case 'uninstall_success':
          toast.success(t('APP_UNINSTALL_SUCCESS', { id: appUrn }));
          break;
        case 'uninstall_error':
          toast.error(t('APP_ERROR_APP_FAILED_TO_UNINSTALL', { id: appUrn }));
          break;
        case 'update_success':
          toast.success(t('APP_UPDATE_SUCCESS', { id: appUrn }));
          break;
        case 'update_error':
          toast.error(t('APP_ERROR_APP_FAILED_TO_UPDATE', { id: appUrn }));
          break;
        case 'reset_success':
          toast.success(t('APP_RESET_SUCCESS', { id: appUrn }));
          break;
        case 'reset_error':
          toast.error(t('APP_ERROR_APP_FAILED_TO_RESET', { id: appUrn }));
          break;
        case 'restart_success':
          toast.success(t('APP_RESTART_SUCCESS', { id: appUrn }));
          break;
        case 'restart_error':
          toast.error(t('APP_ERROR_APP_FAILED_TO_RESTART', { id: appUrn }));
          break;
        case 'backup_success':
          toast.success(t('APP_BACKUP_SUCCESS', { id: appUrn }));
          break;
        case 'backup_error':
          toast.error(t('APP_BACKUP_ERROR', { id: appUrn }));
          break;
        case 'restore_success':
          toast.success(t('APP_RESTORE_SUCCESS', { id: appUrn }));
          break;
        case 'restore_error':
          toast.error(t('APP_RESTORE_ERROR', { id: appUrn }));
          break;
        default:
          break;
      }
    },
  });

  return children;
};
