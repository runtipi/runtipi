import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader } from '@/components/ui/Dialog';
import { useTranslations } from 'next-intl';
import { AppInfo } from '@runtipi/shared';
import { Button } from '@/components/ui/Button';
import { useAction } from 'next-safe-action/hooks';
import { restartAppAction } from '@/actions/app-actions/restart-app-action';
import toast from 'react-hot-toast';
import { useAppStatus } from '@/hooks/useAppStatus';

interface IProps {
  info: AppInfo;
  isOpen: boolean;
  onClose: () => void;
}

export const RestartModal: React.FC<IProps> = ({ info, isOpen, onClose }) => {
  const t = useTranslations();
  const setAppStatus = useAppStatus((state) => state.setAppStatus);

  const restartMutation = useAction(restartAppAction, {
    onError: ({ error }) => {
      if (error.serverError) toast.error(error.serverError);
    },
    onExecute: () => {
      setAppStatus(info.id, 'restarting');
      onClose();
    },
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent size="sm">
        <DialogHeader>
          <h5 className="modal-title">{t('APP_RESTART_FORM_TITLE', { name: info.name })}</h5>
        </DialogHeader>
        <DialogDescription>
          <span className="text-muted">{t('APP_RESTART_FORM_SUBTITLE')}</span>
        </DialogDescription>
        <DialogFooter>
          <Button onClick={() => restartMutation.execute({ id: info.id })} intent="danger">
            {t('APP_RESTART_FORM_SUBMIT')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
