import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader } from '@/components/ui/Dialog';
import { useTranslations } from 'next-intl';
import { AppInfo } from '@runtipi/shared';
import { Button } from '@/components/ui/Button';
import { useAction } from 'next-safe-action/hooks';
import { updateAppAction } from '@/actions/app-actions/update-app-action';
import toast from 'react-hot-toast';
import { useAppStatus } from '@/hooks/useAppStatus';
import { Switch } from '@/components/ui/Switch';

interface IProps {
  newVersion: string;
  info: Pick<AppInfo, 'id' | 'name'>;
  isOpen: boolean;
  onClose: () => void;
}

export const UpdateModal: React.FC<IProps> = ({ info, newVersion, isOpen, onClose }) => {
  const t = useTranslations();
  const setAppStatus = useAppStatus((state) => state.setAppStatus);
  const [backupApp, setBackupApp] = useState(true);

  const updateMutation = useAction(updateAppAction, {
    onError: ({ error }) => {
      if (error.serverError) toast.error(error.serverError);
    },
    onExecute: () => {
      setAppStatus(info.id, 'updating');
      onClose();
    },
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent size="sm">
        <DialogHeader>
          <h5 className="modal-title">{t('APP_UPDATE_FORM_TITLE', { name: info.name })}</h5>
        </DialogHeader>
        <DialogDescription>
          <div className="text-muted">
            {t('APP_UPDATE_FORM_SUBTITLE_1')} <b>{newVersion}</b> ?<br />
            {t('APP_UPDATE_FORM_SUBTITLE_2')}
          </div>
          <div className="mt-3">
            <Switch checked={backupApp} onCheckedChange={setBackupApp} label={t('APP_UPDATE_FORM_BACKUP')} />
          </div>
        </DialogDescription>
        <DialogFooter>
          <Button onClick={() => updateMutation.execute({ id: info.id, performBackup: backupApp })} intent="success">
            {t('APP_UPDATE_FORM_SUBMIT')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
