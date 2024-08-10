import type { AppBackup } from '@/api/app-backups/route';
import { useDateFormat } from '@/components/DateFormat/DateFormat';
import { Button } from '@/components/ui/Button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { IconAlertTriangle } from '@tabler/icons-react';
import { useTranslations } from 'next-intl';
import type React from 'react';

interface IProps {
  backup?: AppBackup | null;
  appName: string;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const RestoreModal: React.FC<IProps> = ({ appName, backup, isOpen, onClose, onConfirm }) => {
  const t = useTranslations();
  const formatDate = useDateFormat();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>{t('APP_RESTORE_TITLE', { name: appName })}</DialogTitle>
        </DialogHeader>
        <DialogDescription className="text-center py-4">
          <IconAlertTriangle className="icon mb-2 text-warning icon-lg" />
          <h3>{t('APP_RESTORE_WARNING', { id: backup?.id, date: formatDate(backup?.date) })}</h3>
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
