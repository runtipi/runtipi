import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader } from '@/components/ui/Dialog';
import { useTranslations } from 'next-intl';
import { AppInfo } from '@runtipi/shared';
import { ScrollArea } from '@/components/ui/ScrollArea';
import { AppStatus } from '@/server/db/schema';
import { InstallForm, type FormValues } from '../InstallForm';

interface IProps {
  info: AppInfo;
  config: Record<string, unknown>;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (values: FormValues) => void;
  onReset: () => void;
  status?: AppStatus;
}

export const UpdateSettingsModal: React.FC<IProps> = ({ info, config, isOpen, onClose, onSubmit, onReset, status }) => {
  const t = useTranslations();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <h5 className="modal-title">{t('APP_UPDATE_SETTINGS_FORM_TITLE', { name: info.name })}</h5>
        </DialogHeader>
        <ScrollArea maxHeight={500}>
          <DialogDescription>
            <InstallForm
              onSubmit={onSubmit}
              formFields={info.form_fields}
              info={info}
              initialValues={{ ...config }}
              onReset={onReset}
              status={status}
            />
          </DialogDescription>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
