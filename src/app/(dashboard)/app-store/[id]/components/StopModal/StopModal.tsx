import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader } from '@/components/ui/Dialog';
import { useTranslations } from 'next-intl';
import { AppInfo } from '@runtipi/shared';
import { Button } from '@/components/ui/Button';

interface IProps {
  info: AppInfo;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const StopModal: React.FC<IProps> = ({ info, isOpen, onClose, onConfirm }) => {
  const t = useTranslations('apps.app-details.stop-form');

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent size="sm">
        <DialogHeader>
          <h5 className="modal-title">{t('title', { name: info.name })}</h5>
        </DialogHeader>
        <DialogDescription>
          <div className="text-muted">{t('subtitle')}</div>
        </DialogDescription>
        <DialogFooter>
          <Button onClick={onConfirm} className="btn-danger">
            {t('submit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
