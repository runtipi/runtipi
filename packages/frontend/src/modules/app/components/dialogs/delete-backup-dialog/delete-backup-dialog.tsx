import { useDateFormat } from '@/components/date-format/date-format';
import { Button } from '@/components/ui/Button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import type { AppBackup } from '@/types/app.types';
import { IconAlertTriangle } from '@tabler/icons-react';
import type React from 'react';
import { useTranslation } from 'react-i18next';

interface IProps {
  backup?: AppBackup | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const DeleteAppBackupDialog: React.FC<IProps> = ({ backup, isOpen, onClose, onConfirm }) => {
  const { t } = useTranslation();
  const formatDate = useDateFormat();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent type="danger" size="sm">
        <DialogHeader>
          <DialogTitle>{t('DELETE_BACKUP_MODAL_TITLE')}</DialogTitle>
        </DialogHeader>
        <DialogDescription className="text-center py-4">
          <IconAlertTriangle className="icon mb-2 text-danger icon-lg" />
          <h3>{t('DELETE_BACKUP_MODAL_WARNING', { id: backup?.id, date: formatDate(new Date(backup?.date ?? 0)) })}</h3>
          <div className="text-muted">{t('DELETE_BACKUP_MODAL_SUBTITLE')}</div>
        </DialogDescription>
        <DialogFooter>
          <Button onClick={onConfirm} intent="danger">
            {t('DELETE_BACKUP_MODAL_SUBMIT')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
