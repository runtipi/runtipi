import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader } from '@/components/ui/Dialog';
import { useTranslations } from 'next-intl';
import { Button } from '../../../../components/ui/Button';
import { AppInfo } from '../../../../core/types';

interface IProps {
  newVersion: string;
  info: Pick<AppInfo, 'name'>;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const UpdateModal: React.FC<IProps> = ({ info, newVersion, isOpen, onClose, onConfirm }) => {
  const t = useTranslations('apps.app-details.update-form');

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent size="sm">
        <DialogHeader>
          <h5 className="modal-title">{t('title', { name: info.name })}</h5>
        </DialogHeader>
        <DialogDescription>
          <div className="text-muted">
            {t('subtitle1')} <b>{newVersion}</b> ?<br />
            {t('subtitle2')}
          </div>
        </DialogDescription>
        <DialogFooter>
          <Button onClick={onConfirm} className="btn-success">
            {t('submit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
