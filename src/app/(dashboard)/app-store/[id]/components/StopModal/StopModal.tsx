import { stopAppAction } from '@/actions/app-actions/stop-app-action';
import { Button } from '@/components/ui/Button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader } from '@/components/ui/Dialog';
import { useAppStatus } from '@/hooks/useAppStatus';
import type { AppInfo } from '@runtipi/shared';
import { useTranslations } from 'next-intl';
import { useAction } from 'next-safe-action/hooks';
import type React from 'react';
import toast from 'react-hot-toast';

interface IProps {
  info: AppInfo;
  isOpen: boolean;
  onClose: () => void;
}

export const StopModal: React.FC<IProps> = ({ info, isOpen, onClose }) => {
  const t = useTranslations();
  const setAppStatus = useAppStatus((state) => state.setAppStatus);

  const stopMutation = useAction(stopAppAction, {
    onError: ({ error }) => {
      if (error.serverError) toast.error(error.serverError);
    },
    onExecute: () => {
      setAppStatus(info.id, 'stopping');
      onClose();
    },
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent size="sm">
        <DialogHeader>
          <h5 className="modal-title">{t('APP_STOP_FORM_TITLE', { name: info.name })}</h5>
        </DialogHeader>
        <DialogDescription>
          <span className="text-muted">{t('APP_STOP_FORM_SUBTITLE')}</span>
        </DialogDescription>
        <DialogFooter>
          <Button onClick={() => stopMutation.execute({ id: info.id })} intent="danger">
            {t('APP_STOP_FORM_SUBMIT')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
