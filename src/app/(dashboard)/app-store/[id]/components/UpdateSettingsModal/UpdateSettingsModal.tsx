import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader } from '@/components/ui/Dialog';
import { useTranslations } from 'next-intl';
import { AppInfo } from '@runtipi/shared';
import { ScrollArea } from '@/components/ui/ScrollArea';
import { AppStatus } from '@/server/db/schema';
import { InstallForm, type FormValues } from '../InstallForm';
import { useAction } from 'next-safe-action/hooks';
import { updateAppConfigAction } from '@/actions/app-actions/update-app-config-action';
import toast from 'react-hot-toast';

interface IProps {
  info: AppInfo;
  config: Record<string, unknown>;
  isOpen: boolean;
  onClose: () => void;
  onReset: () => void;
  status?: AppStatus;
}

export const UpdateSettingsModal: React.FC<IProps> = ({ info, config, isOpen, onClose, onReset, status }) => {
  const t = useTranslations();

  const updateConfigMutation = useAction(updateAppConfigAction, {
    onError: ({ error }) => {
      if (error.serverError) toast.error(error.serverError);
    },
    onExecute: () => {
      onClose();
    },
    onSuccess: () => {
      toast.success(t('APP_UPDATE_CONFIG_SUCCESS'));
    },
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <h5 className="modal-title">{t('APP_UPDATE_SETTINGS_FORM_TITLE', { name: info.name })}</h5>
        </DialogHeader>
        <ScrollArea maxHeight={500}>
          <DialogDescription>
            <InstallForm
              onSubmit={(values: FormValues) => updateConfigMutation.execute({ id: info.id, form: values })}
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
