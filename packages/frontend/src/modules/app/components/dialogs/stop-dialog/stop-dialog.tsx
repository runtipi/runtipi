import { stopAppMutation } from '@/api-client/@tanstack/react-query.gen';
import { Button } from '@/components/ui/Button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { useAppStatus } from '@/modules/app/helpers/use-app-status';
import type { AppInfo } from '@/types/app.types';
import type { TranslatableError } from '@/types/error.types';
import { useMutation } from '@tanstack/react-query';
import type React from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

interface IProps {
  info: AppInfo;
  isOpen: boolean;
  onClose: () => void;
}

export const StopDialog: React.FC<IProps> = ({ info, isOpen, onClose }) => {
  const { t } = useTranslation();
  const { setOptimisticStatus } = useAppStatus();

  const stopMutation = useMutation({
    ...stopAppMutation(),
    onError: (error: TranslatableError) => {
      toast.error(t(error.message, error.intlParams));
    },
    onMutate: () => {
      setOptimisticStatus('stopping', info.id);
      onClose();
    },
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>{t('APP_STOP_FORM_TITLE', { name: info.name })}</DialogTitle>
        </DialogHeader>
        <DialogDescription>
          <span className="text-muted">{t('APP_STOP_FORM_SUBTITLE')}</span>
        </DialogDescription>
        <DialogFooter>
          <Button onClick={() => stopMutation.mutate({ path: { id: info.id } })} intent="danger">
            {t('APP_STOP_FORM_SUBMIT')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
