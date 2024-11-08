import { installAppAction } from '@/actions/app-actions/install-app-action';
import { Dialog, DialogContent, DialogDescription, DialogHeader } from '@/components/ui/Dialog';
import { ScrollArea } from '@/components/ui/ScrollArea';
import { useAppStatus } from '@/hooks/useAppStatus';
import type { AppInfo } from '@runtipi/shared';
import { useTranslations } from 'next-intl';
import { useAction } from 'next-safe-action/hooks';
import type React from 'react';
import toast from 'react-hot-toast';
import { InstallForm } from '../InstallForm';

interface IProps {
  info: AppInfo;
  isOpen: boolean;
  onClose: () => void;
}

export const InstallModal: React.FC<IProps> = ({ info, isOpen, onClose }) => {
  const t = useTranslations();
  const setAppStatus = useAppStatus((state) => state.setAppStatus);

  const installMutation = useAction(installAppAction, {
    onError: ({ error }) => {
      if (error.serverError) {
        toast.error(error.serverError);
      }
      setAppStatus(info.id, 'missing');
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
