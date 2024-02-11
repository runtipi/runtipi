import { IconAlertTriangle } from '@tabler/icons-react';
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

export const UninstallModal: React.FC<IProps> = ({ info, isOpen, onClose, onConfirm }) => {
  const t = useTranslations();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent type="danger" size="sm">
        <DialogHeader>
          <h5 className="modal-title">{t('APP_UNINSTALL_FORM_TITLE', { name: info.name })}</h5>
        </DialogHeader>
        <DialogDescription className="text-center py-4">
          <IconAlertTriangle className="icon mb-2 text-danger icon-lg" />
          <h3>{t('APP_UNINSTALL_FORM_WARNING')}</h3>
          <div className="text-muted">{t('APP_UNINSTALL_FORM_SUBTITLE')}</div>
        </DialogDescription>
        <DialogFooter>
          <Button onClick={onConfirm} className="btn-danger">
            {t('APP_UNINSTALL_FORM_SUBMIT')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
