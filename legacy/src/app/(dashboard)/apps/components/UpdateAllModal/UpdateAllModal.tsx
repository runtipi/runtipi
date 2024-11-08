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
  const t = useTranslations();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent size="sm">
        <DialogHeader>
          <h5 className="modal-title">{t('MY_APPS_UPDATE_ALL_FORM_TITLE')}</h5>
        </DialogHeader>
        <DialogDescription>
          <div className="text-muted">
            {t('MY_APPS_UPDATE_ALL_FORM_SUBTITLE_1')}
            <br />
            <br />
            {t('MY_APPS_UPDATE_ALL_FORM_SUBTITLE_2')}
          </div>
        </DialogDescription>
        <DialogFooter>
          <Button onClick={onConfirm} intent="success">
            {t('MY_APPS_UPDATE_ALL_FORM_SUBMIT')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
