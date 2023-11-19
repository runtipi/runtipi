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
  isLoading?: boolean;
}

export const ResetAppModal: React.FC<IProps> = ({ info, isOpen, onClose, onConfirm, isLoading }) => {
  const t = useTranslations('apps.app-details.reset-app-form');

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent type="danger" size="sm">
        <DialogHeader>
          <h5 className="modal-title">{t('title', { name: info.name })}</h5>
        </DialogHeader>
        <DialogDescription className="text-center py-4">
          <IconAlertTriangle className="icon mb-2 text-danger icon-lg" />
          <h3>{t('warning')}</h3>
          <div className="text-muted">{t('subtitle')}</div>
        </DialogDescription>
        <DialogFooter>
          <Button loading={isLoading} onClick={onConfirm} className="btn-danger">
            {t('submit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
