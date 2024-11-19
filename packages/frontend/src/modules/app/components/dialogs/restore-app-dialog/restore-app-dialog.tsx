import { useDateFormat } from '@/components/date-format/date-format';
import { Button } from '@/components/ui/Button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import type { AppBackup } from '@/types/app.types';
import { IconAlertTriangle } from '@tabler/icons-react';
import type React from 'react';
import { useTranslation } from 'react-i18next';

interface IProps {
  backup?: AppBackup | null;
  appName: string;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const RestoreAppDialog: React.FC<IProps> = ({ appName, backup, isOpen, onClose, onConfirm }) => {
  const { t } = useTranslation();
  const formatDate = useDateFormat();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>{t('APP_RESTORE_TITLE', { name: appName })}</DialogTitle>
        </DialogHeader>
        <DialogDescription className="text-center py-4">
          <IconAlertTriangle className="icon mb-2 text-warning icon-lg" />
          <h3>{t('APP_RESTORE_WARNING', { id: backup?.id, date: formatDate(new Date(backup?.date ?? 0)) })}</h3>
          <div className="text-muted">{t('APP_RESTORE_SUBTITLE')}</div>
        </DialogDescription>
        <DialogFooter>
          <Button onClick={onConfirm} intent="warning">
            {t('APP_RESTORE_SUBMIT')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
