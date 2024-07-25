import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';
import type { AppBackup } from '@/api/app-backups/route';
import { IconAlertTriangle } from '@tabler/icons-react';
import { useDateFormat } from '@/components/DateFormat/DateFormat';

interface IProps {
  backup?: AppBackup | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const DeleteBackupModal: React.FC<IProps> = ({ backup, isOpen, onClose, onConfirm }) => {
  const t = useTranslations();
  const formatDate = useDateFormat();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent type="danger" size="sm">
        <DialogHeader>
          <DialogTitle>{t('DELETE_BACKUP_MODAL_TITLE')}</DialogTitle>
        </DialogHeader>
        <DialogDescription className="text-center py-4">
          <IconAlertTriangle className="icon mb-2 text-danger icon-lg" />
          <h3>{t('DELETE_BACKUP_MODAL_WARNING', { id: backup?.id, date: formatDate(backup?.date) })}</h3>
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
