import { IconAlertTriangle } from '@tabler/icons-react';
import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader } from '@/components/ui/Dialog';
import { useTranslations } from 'next-intl';
import { AppInfo } from '@runtipi/shared';
import { Button } from '@/components/ui/Button';
import { useAction } from 'next-safe-action/hooks';
import { useAppStatusStore } from 'src/app/components/ClientProviders/AppStatusProvider/app-status-provider';
import { uninstallAppAction } from '@/actions/app-actions/uninstall-app-action';
import toast from 'react-hot-toast';

interface IProps {
  info: AppInfo;
  isOpen: boolean;
  onClose: () => void;
}

export const UninstallModal: React.FC<IProps> = ({ info, isOpen, onClose }) => {
  const t = useTranslations();
  const setAppStatus = useAppStatusStore((state) => state.setAppStatus);

  const uninstallMutation = useAction(uninstallAppAction, {
    onError: ({ error }) => {
      if (error.serverError) toast.error(error.serverError);
    },
    onExecute: () => {
      setAppStatus(info.id, 'uninstalling');
      onClose();
    },
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent type="danger" size="sm">
        <DialogHeader>
          <h5 className="modal-title">{t('APP_UNINSTALL_FORM_TITLE', { name: info.name })}</h5>
        </DialogHeader>
        <DialogDescription className="text-center py-4">
          <IconAlertTriangle className="icon mb-2 text-danger icon-lg" />
          <h3>{t('APP_UNINSTALL_FORM_WARNING')}</h3>
          <div className="text-muted">{t('APP_UNINSTALL_FORM_SUBTITLE')}</div>
        </DialogDescription>
        <DialogFooter>
          <Button onClick={() => uninstallMutation.execute({ id: info.id })} className="btn-danger">
            {t('APP_UNINSTALL_FORM_SUBMIT')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
