import { updateAppConfigMutation } from '@/api-client/@tanstack/react-query.gen';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { ScrollArea } from '@/components/ui/ScrollArea';
import type { AppInfo, AppStatus } from '@/types/app.types';
import type { TranslatableError } from '@/types/error.types';
import { useMutation } from '@tanstack/react-query';
import type React from 'react';
import { useId } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { InstallFormButtons } from '../../install-form-buttons/install-form-buttons';
import { type FormValues, InstallForm } from '../../install-form/install-form';

interface IProps {
  info: AppInfo;
  config: Record<string, unknown>;
  isOpen: boolean;
  onClose: () => void;
  onReset: () => void;
  status?: AppStatus;
}

export const UpdateSettingsDialog: React.FC<IProps> = ({ info, config, isOpen, onClose, onReset, status }) => {
  const { t } = useTranslation();
  const formId = useId();

  const updateConfig = useMutation({
    ...updateAppConfigMutation(),
    onError: (e: TranslatableError) => {
      toast.error(t(e.message, e.intlParams));
    },
    onMutate: () => {
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
          <DialogTitle>{t('APP_UPDATE_SETTINGS_FORM_TITLE', { name: info.id })}</DialogTitle>
        </DialogHeader>
        <ScrollArea maxHeight={500}>
          <DialogDescription>
            <InstallForm
              onSubmit={(values: FormValues) => updateConfig.mutate({ path: { id: info.id }, body: values })}
              formFields={info.form_fields}
              info={info}
              initialValues={{ ...config }}
              formId={formId}
            />
          </DialogDescription>
        </ScrollArea>
        <DialogFooter>
          <InstallFormButtons loading={updateConfig.isPending} initialValues={{ ...config }} onReset={onReset} status={status} formId={formId} />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
