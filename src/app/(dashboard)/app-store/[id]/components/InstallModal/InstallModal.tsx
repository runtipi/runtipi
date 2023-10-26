import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader } from '@/components/ui/Dialog';
import { useTranslations } from 'next-intl';
import { AppInfo } from '@runtipi/shared';
import { ScrollArea } from '@/components/ui/ScrollArea';
import { InstallForm, FormValues } from '../InstallForm';

interface IProps {
  info: AppInfo;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (values: FormValues) => void;
}

export const InstallModal: React.FC<IProps> = ({ info, isOpen, onClose, onSubmit }) => {
  const t = useTranslations('apps.app-details.install-form');

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <h5 className="modal-title">{t('title', { name: info.name })}</h5>
        </DialogHeader>
        <ScrollArea maxHeight={500}>
          <DialogDescription>
            <InstallForm onSubmit={onSubmit} formFields={info.form_fields} info={info} />
          </DialogDescription>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
