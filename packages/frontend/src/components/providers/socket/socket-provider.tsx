import { useSocket } from '@/lib/hooks/use-socket';
import { useQueryClient } from '@tanstack/react-query';
import type { PropsWithChildren } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

export const SocketProvider = ({ children }: PropsWithChildren) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  useSocket({
    onEvent: (event, data) => {
      if (data.error) {
        console.error(data.error);
      }

      queryClient.invalidateQueries();

      switch (event) {
        case 'status_change':
          break;
        case 'install_success':
          toast.success(t('APP_INSTALL_SUCCESS', { id: data.appUrn }));
          break;
        case 'install_error':
          toast.error(t('APP_ERROR_APP_FAILED_TO_INSTALL', { id: data.appUrn }));
          break;
        case 'start_success':
          toast.success(t('APP_START_SUCCESS', { id: data.appUrn }));
          break;
        case 'start_error':
          toast.error(t('APP_ERROR_APP_FAILED_TO_START', { id: data.appUrn }));
          break;
        case 'stop_success':
          toast.success(t('APP_STOP_SUCCESS', { id: data.appUrn }));
          break;
        case 'stop_error':
          toast.error(t('APP_ERROR_APP_FAILED_TO_STOP', { id: data.appUrn }));
          break;
        case 'uninstall_success':
          toast.success(t('APP_UNINSTALL_SUCCESS', { id: data.appUrn }));
          break;
        case 'uninstall_error':
          toast.error(t('APP_ERROR_APP_FAILED_TO_UNINSTALL', { id: data.appUrn }));
          break;
        case 'update_success':
          toast.success(t('APP_UPDATE_SUCCESS', { id: data.appUrn }));
          break;
        case 'update_error':
          toast.error(t('APP_ERROR_APP_FAILED_TO_UPDATE', { id: data.appUrn }));
          break;
        case 'reset_success':
          toast.success(t('APP_RESET_SUCCESS', { id: data.appUrn }));
          break;
        case 'reset_error':
          toast.error(t('APP_ERROR_APP_FAILED_TO_RESET', { id: data.appUrn }));
          break;
        case 'restart_success':
          toast.success(t('APP_RESTART_SUCCESS', { id: data.appUrn }));
          break;
        case 'restart_error':
          toast.error(t('APP_ERROR_APP_FAILED_TO_RESTART', { id: data.appUrn }));
          break;
        case 'backup_success':
          toast.success(t('APP_BACKUP_SUCCESS', { id: data.appUrn }));
          break;
        case 'backup_error':
          toast.error(t('APP_BACKUP_ERROR', { id: data.appUrn }));
          break;
        case 'restore_success':
          toast.success(t('APP_RESTORE_SUCCESS', { id: data.appUrn }));
          break;
        case 'restore_error':
          toast.error(t('APP_RESTORE_ERROR', { id: data.appUrn }));
          break;
        default:
          break;
      }
    },
    selector: { type: 'app' },
  });

  return children;
};
