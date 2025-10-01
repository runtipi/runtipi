import { Button } from '@/components/ui/Button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import type { AppInfo } from '@/types/app.types';
import type { TranslatableError } from '@/types/error.types';
import { IconAlertTriangle } from '@tabler/icons-react';
import { useMutation } from '@tanstack/react-query';
import type React from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

interface IProps {
  info: AppInfo;
  isOpen: boolean;
  onClose: () => void;
}

export const ClearLogsDialog: React.FC<IProps> = ({ info, isOpen, onClose }) => {
  const { t } = useTranslation();

  const clearLogsMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/app-lifecycle/${info.urn}/logs`, {
        method: 'DELETE',
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to clear logs');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast.success(t('APP_CLEAR_LOGS_SUCCESS'));
      onClose();
    },
    onError: (e: TranslatableError) => {
      toast.error(t(e.message || 'APP_CLEAR_LOGS_ERROR', e.intlParams));
    },
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent type="danger" size="sm">
        <DialogHeader>
          <DialogTitle>{t('APP_CLEAR_LOGS_FORM_TITLE', { name: info.name })}</DialogTitle>
        </DialogHeader>
        <DialogDescription className="text-center py-4">
          <IconAlertTriangle className="icon mb-2 text-danger icon-lg" />
          <h3>{t('APP_CLEAR_LOGS_FORM_WARNING')}</h3>
          <div className="text-muted">{t('APP_CLEAR_LOGS_FORM_SUBTITLE')}</div>
        </DialogDescription>
        <DialogFooter>
          <Button loading={clearLogsMutation.isPending} onClick={() => clearLogsMutation.mutate()} intent="danger">
            {t('APP_CLEAR_LOGS_FORM_SUBMIT')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
