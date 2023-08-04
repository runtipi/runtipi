import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader } from '@/components/ui/Dialog';
import { useTranslations } from 'next-intl';
import { AppInfo } from '@runtipi/shared';
import { InstallForm } from './InstallForm';
import { FormValues } from './InstallForm/InstallForm';

interface IProps {
  info: AppInfo;
  config: Record<string, unknown>;
  isOpen: boolean;
  exposed?: boolean;
  domain?: string;
  onClose: () => void;
  onSubmit: (values: FormValues) => void;
}

export const UpdateSettingsModal: React.FC<IProps> = ({ info, config, isOpen, onClose, onSubmit, exposed, domain }) => {
  const t = useTranslations('apps.app-details.update-settings-form');

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <h5 className="modal-title">{t('title', { name: info.name })}</h5>
        </DialogHeader>
        <DialogDescription>
          <InstallForm onSubmit={onSubmit} formFields={info.form_fields} info={info} initalValues={{ ...config, exposed, domain }} />
        </DialogDescription>
      </DialogContent>
    </Dialog>
  );
};
