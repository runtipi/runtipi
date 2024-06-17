import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { useTranslations } from 'next-intl';
import { AppInfo } from '@runtipi/shared';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useForm } from 'react-hook-form';

interface IProps {
  info: AppInfo;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (values: { archiveName: string }) => void;
}

export const BackupModal: React.FC<IProps> = ({ info, isOpen, onClose, onSubmit }) => {
  const t = useTranslations();

  type FormValues = {
    archiveName: string;
  };

  const { register, handleSubmit } = useForm<FormValues>();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>{t('APP_BACKUP_TITLE', { name: info.name })}</DialogTitle>
        </DialogHeader>
        <DialogDescription>
          <form onSubmit={handleSubmit(onSubmit)}>
            <p className="text-muted">{t('APP_BACKUP_SUBTITILE')}</p>
            <div className="mt-1 mb-3">
              <Input {...register('archiveName')} label="Backup" placeholder="mybackup"></Input>
            </div>
            <div className="d-flex justify-content-end">
              <Button type="submit" className="btn-success">
                {t('APP_BACKUP_SUBMIT')}
              </Button>
            </div>
          </form>
        </DialogDescription>
      </DialogContent>
    </Dialog>
  );
};
