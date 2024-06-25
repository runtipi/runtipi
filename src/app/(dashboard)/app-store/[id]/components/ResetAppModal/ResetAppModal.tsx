import { IconAlertTriangle } from '@tabler/icons-react';
import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader } from '@/components/ui/Dialog';
import { useTranslations } from 'next-intl';
import { AppInfo } from '@runtipi/shared';
import { Button } from '@/components/ui/Button';
import { useAppStatusStore } from 'src/app/components/ClientProviders/AppStatusProvider/app-status-provider';
import { useAction } from 'next-safe-action/hooks';
import { resetAppAction } from '@/actions/app-actions/reset-app-action';
import toast from 'react-hot-toast';

interface IProps {
  info: AppInfo;
  isOpen: boolean;
  onClose: () => void;
  isLoading?: boolean;
}

export const ResetAppModal: React.FC<IProps> = ({ info, isOpen, onClose, isLoading }) => {
  const t = useTranslations();
  const setAppStatus = useAppStatusStore((state) => state.setAppStatus);

  const resetMutation = useAction(resetAppAction, {
    onError: ({ error }) => {
      if (error.serverError) toast.error(error.serverError);
    },
    onExecute: () => {
      setAppStatus(info.id, 'resetting');
      onClose();
    },
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent type="danger" size="sm">
        <DialogHeader>
          <h5 className="modal-title">{t('APP_RESET_FORM_TITLE', { name: info.name })}</h5>
        </DialogHeader>
        <DialogDescription className="text-center py-4">
          <IconAlertTriangle className="icon mb-2 text-danger icon-lg" />
          <h3>{t('APP_RESET_FORM_WARNING')}</h3>
          <div className="text-muted">{t('APP_RESET_FORM_SUBTITLE')}</div>
        </DialogDescription>
        <DialogFooter>
          <Button loading={isLoading} onClick={() => resetMutation.execute({ id: info.id })} intent="danger">
            {t('APP_RESET_FORM_SUBMIT')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
