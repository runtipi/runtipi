import { Button } from '@/components/ui/Button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import type React from 'react';
import { useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import './upload-backup-dialog.css';

interface IProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (file: File) => void;
}

export const UploadBackupDialog: React.FC<IProps> = ({ isOpen, onClose, onConfirm }) => {
  const { t } = useTranslation();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.endsWith('.tar.gz')) {
        toast.error(t('APP_BACKUP_UPLOAD_ERROR'));
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleConfirm = () => {
    if (selectedFile) {
      onConfirm(selectedFile);
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>{t('APP_BACKUP_UPLOAD_TITLE')}</DialogTitle>
        </DialogHeader>
        <DialogDescription>
          <span className="text-muted d-block mb-3">{t('APP_BACKUP_UPLOAD_SUBTITLE')}</span>
          <div className="form-group">
            <label htmlFor="backup-file" className="form-label">
              {t('APP_BACKUP_UPLOAD_FILE_LABEL')}
            </label>
            <input ref={fileInputRef} id="backup-file" type="file" accept=".tar.gz" onChange={handleFileChange} className="form-control" />
            {selectedFile && (
              <div className="mt-2 text-muted small">
                {t('SELECTED_FILE')}: {selectedFile.name}
              </div>
            )}
          </div>
        </DialogDescription>
        <DialogFooter>
          <Button onClick={handleConfirm} intent="success" disabled={!selectedFile}>
            {t('APP_BACKUP_UPLOAD_SUBMIT')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
