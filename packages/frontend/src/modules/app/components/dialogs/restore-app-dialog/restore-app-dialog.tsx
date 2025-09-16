import { useDateFormat } from '@/components/date-format/date-format';
import { Button } from '@/components/ui/Button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import type { AppBackup } from '@/types/app.types';
import { IconAlertTriangle, IconUpload } from '@tabler/icons-react';
import type React from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface IProps {
  backup?: AppBackup | null;
  appName: string;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onUploadConfirm: (file: File) => void;
}

export const RestoreAppDialog: React.FC<IProps> = ({ appName, backup, isOpen, onClose, onConfirm, onUploadConfirm }) => {
  const { t } = useTranslation();
  const formatDate = useDateFormat();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleUploadAndRestore = () => {
    if (selectedFile) {
      onUploadConfirm(selectedFile);
      setSelectedFile(null);
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>{t('APP_RESTORE_TITLE', { name: appName })}</DialogTitle>
        </DialogHeader>
        <DialogDescription className="text-center py-4">
          <IconAlertTriangle className="icon mb-2 text-warning icon-lg" />
          {backup ? (
            <>
              <h3>{t('APP_RESTORE_WARNING', { id: backup.id, date: formatDate(new Date(backup.date)) })}</h3>
              <div className="text-muted">{t('APP_RESTORE_SUBTITLE')}</div>
            </>
          ) : (
            <>
              <h3>{t('APP_RESTORE_OR_UPLOAD')}</h3>
              <div className="mt-3 text-start">
                <label htmlFor="backup-file" className="form-label">
                  {t('APP_RESTORE_UPLOAD_BACKUP')}
                </label>
                <input
                  type="file"
                  id="backup-file"
                  className="form-control"
                  accept=".tar.gz"
                  onChange={handleFileChange}
                />
                <div className="form-text">{t('APP_RESTORE_UPLOAD_BACKUP_HINT')}</div>
              </div>
            </>
          )}
        </DialogDescription>
        <DialogFooter>
          {backup ? (
            <Button onClick={onConfirm} intent="warning">
              {t('APP_RESTORE_SUBMIT')}
            </Button>
          ) : (
            <Button onClick={handleUploadAndRestore} intent="warning" disabled={!selectedFile}>
              <IconUpload className="icon icon-sm me-1" />
              {t('APP_RESTORE_SUBMIT')}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
