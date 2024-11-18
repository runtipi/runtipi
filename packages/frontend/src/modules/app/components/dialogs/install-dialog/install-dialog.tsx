import { installAppMutation } from '@/api-client/@tanstack/react-query.gen';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { useAppStatus } from '@/modules/app/helpers/use-app-status';
import type { AppInfo } from '@/types/app.types';
import type { TranslatableError } from '@/types/error.types';
import { useMutation } from '@tanstack/react-query';
import type React from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { InstallForm } from '../../install-form/install-form';
import { ScrollArea } from '@/components/ui/ScrollArea';

interface IProps {
  info: AppInfo;
  isOpen: boolean;
  onClose: () => void;
}

export const InstallDialog: React.FC<IProps> = ({ info, isOpen, onClose }) => {
  const { t } = useTranslation();
  const { setOptimisticStatus } = useAppStatus();

  const installMutation = useMutation({
    ...installAppMutation(),
    onError: (e: TranslatableError) => {
      toast.error(t(e.message, e.intlParams));
    },
    onMutate: () => {
      setOptimisticStatus('installing', info.id);
      onClose();
    },
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('APP_INSTALL_FORM_TITLE', { name: info.name })}</DialogTitle>
        </DialogHeader>
        <ScrollArea maxHeight={500}>
          <InstallForm
            onSubmit={(data) => installMutation.mutate({ path: { id: info.id }, body: data })}
            formFields={info.form_fields}
            info={info}
          />
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
