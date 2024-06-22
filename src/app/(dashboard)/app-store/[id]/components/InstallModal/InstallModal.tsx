import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader } from '@/components/ui/Dialog';
import { useTranslations } from 'next-intl';
import { AppInfo } from '@runtipi/shared';
import { ScrollArea } from '@/components/ui/ScrollArea';
import { InstallForm } from '../InstallForm';
import { useAction } from 'next-safe-action/hooks';
import { installAppAction } from '@/actions/app-actions/install-app-action';
import toast from 'react-hot-toast';
import { useAppStatusStore } from 'src/app/components/ClientProviders/AppStatusProvider/app-status-provider';

interface IProps {
  info: AppInfo;
  isOpen: boolean;
  onClose: () => void;
}

export const InstallModal: React.FC<IProps> = ({ info, isOpen, onClose }) => {
  const t = useTranslations();
  const setAppStatus = useAppStatusStore((state) => state.setAppStatus);

  const installMutation = useAction(installAppAction, {
    onError: (e) => {
      if (e.serverError) toast.error(e.serverError);
    },
    onExecute: () => {
      setAppStatus(info.id, 'installing');
      onClose();
    },
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <h5 className="modal-title">{t('APP_INSTALL_FORM_TITLE', { name: info.name })}</h5>
        </DialogHeader>
        <ScrollArea maxHeight={500}>
          <DialogDescription>
            <InstallForm onSubmit={(data) => installMutation.execute({ id: info.id, form: data })} formFields={info.form_fields} info={info} />
          </DialogDescription>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
