import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader } from '@/components/ui/Dialog';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';

interface IProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const UpdateAllModal: React.FC<IProps> = ({ isOpen, onClose, onConfirm }) => {
  const t = useTranslations('apps.my-apps.update-all-form');

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent size="sm">
        <DialogHeader>
          <h5 className="modal-title">{t('title')}</h5>
        </DialogHeader>
        <DialogDescription>
          <div className="text-muted">
            {t('subtitle1')}
            <br />
            <br />
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
