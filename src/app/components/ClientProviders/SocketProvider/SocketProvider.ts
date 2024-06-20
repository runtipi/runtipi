import { PropsWithChildren } from 'react';
import { revalidateAppAction } from '@/actions/app-actions/revalidate-app';
import { useSocket } from '@/lib/socket/useSocket';
import { useTranslations } from 'next-intl';
import { useAction } from 'next-safe-action/hooks';
import toast from 'react-hot-toast';
import { useAppStatusStore } from '../AppStatusProvider/app-status-provider';

export const SocketProvider = ({ children }: PropsWithChildren) => {
  const revalidateAppMutation = useAction(revalidateAppAction);
  const t = useTranslations();
  const setAppStatus = useAppStatusStore((state) => state.setAppStatus);

  useSocket({
    onEvent: (event, data) => {
      revalidateAppMutation.execute({ id: data.appId });

      switch (event) {
        case 'status_change':
          data.appStatus && setAppStatus(data.appId, data.appStatus);
          break;
        case 'install_success':
          toast.success(t('APP_INSTALL_SUCCESS', { id: data.appId }));
          data.appStatus && setAppStatus(data.appId, data.appStatus);
          break;
        case 'install_error':
          toast.error(t('APP_ERROR_APP_FAILED_TO_INSTALL', { id: data.appId }));
          data.appStatus && setAppStatus(data.appId, data.appStatus);
          break;
        case 'start_success':
          toast.success(t('APP_START_SUCCESS', { id: data.appId }));
          data.appStatus && setAppStatus(data.appId, data.appStatus);
          break;
        case 'start_error':
          toast.error(t('APP_ERROR_APP_FAILED_TO_START', { id: data.appId }));
          data.appStatus && setAppStatus(data.appId, data.appStatus);
          break;
        case 'stop_success':
          toast.success(t('APP_STOP_SUCCESS', { id: data.appId }));
          data.appStatus && setAppStatus(data.appId, data.appStatus);
          break;
        case 'stop_error':
          toast.error(t('APP_ERROR_APP_FAILED_TO_STOP', { id: data.appId }));
          data.appStatus && setAppStatus(data.appId, data.appStatus);
          break;
        case 'uninstall_success':
          toast.success(t('APP_UNINSTALL_SUCCESS', { id: data.appId }));
          data.appStatus && setAppStatus(data.appId, data.appStatus);
          break;
        case 'uninstall_error':
          toast.error(t('APP_ERROR_APP_FAILED_TO_UNINSTALL', { id: data.appId }));
          data.appStatus && setAppStatus(data.appId, data.appStatus);
          break;
        case 'update_success':
          toast.success(t('APP_UPDATE_SUCCESS', { id: data.appId }));
          data.appStatus && setAppStatus(data.appId, data.appStatus);
          break;
        case 'update_error':
          toast.error(t('APP_ERROR_APP_FAILED_TO_UPDATE', { id: data.appId }));
          data.appStatus && setAppStatus(data.appId, data.appStatus);
          break;
        case 'reset_success':
          toast.success(t('APP_RESET_SUCCESS', { id: data.appId }));
          data.appStatus && setAppStatus(data.appId, data.appStatus);
          break;
        case 'reset_error':
          toast.error(t('APP_ERROR_APP_FAILED_TO_RESET', { id: data.appId }));
          data.appStatus && setAppStatus(data.appId, data.appStatus);
          break;
        case 'restart_success':
          toast.success(t('APP_RESTART_SUCCESS', { id: data.appId }));
          data.appStatus && setAppStatus(data.appId, data.appStatus);
          break;
        case 'restart_error':
          toast.error(t('APP_ERROR_APP_FAILED_TO_RESTART', { id: data.appId }));
          data.appStatus && setAppStatus(data.appId, data.appStatus);
          break;
        default:
          break;
      }
    },
    selector: { type: 'app' },
  });

  return children;
};
