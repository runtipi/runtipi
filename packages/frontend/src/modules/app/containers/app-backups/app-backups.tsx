import {
  backupAppMutation,
  deleteAppBackupMutation,
  getAppBackupsOptions,
  restoreAppBackupMutation,
  uploadBackupMutation,
} from '@/api-client/@tanstack/react-query.gen';
import { DateFormat } from '@/components/date-format/date-format';
import { FileSize } from '@/components/file-size/file-size';
import { Button } from '@/components/ui/Button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { TablePagination } from '@/components/ui/TablePagination/TablePagination';
import { useDisclosure } from '@/lib/hooks/use-disclosure';
import type { AppBackup, AppInfo, AppStatus } from '@/types/app.types';
import type { TranslatableError } from '@/types/error.types';
import { useMutation, useSuspenseQuery } from '@tanstack/react-query';
import React from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { BackupAppDialog } from '../../components/dialogs/backup-app-dialog/backup-app-dialog';
import { DeleteAppBackupDialog } from '../../components/dialogs/delete-backup-dialog/delete-backup-dialog';
import { RestoreAppDialog } from '../../components/dialogs/restore-app-dialog/restore-app-dialog';
import { UploadBackupDialog } from '../../components/dialogs/upload-backup-dialog/upload-backup-dialog';

type Props = {
  info: AppInfo;
  status: AppStatus;
};

export const AppBackups = ({ info, status }: Props) => {
  const { t } = useTranslation();
  const [page, setPage] = React.useState(1);
  const [selectedBackup, setSelectedBackup] = React.useState<AppBackup | null>(null);

  const backupModalDisclosure = useDisclosure();
  const restoreModalDisclosure = useDisclosure();
  const deleteBackupModalDisclosure = useDisclosure();
  const uploadModalDisclosure = useDisclosure();

  const { data } = useSuspenseQuery({
    ...getAppBackupsOptions({ path: { urn: info.urn }, query: { page, pageSize: 5 } }),
  });

  const backupApp = useMutation({
    ...backupAppMutation(),
    onMutate: () => {
      backupModalDisclosure.close();
    },
    onError: (e: TranslatableError) => {
      toast.error(t(e.message, e.intlParams));
    },
  });

  const restoreAppBackup = useMutation({
    ...restoreAppBackupMutation(),
    onMutate: () => {
      restoreModalDisclosure.close();
    },
    onError: (e: TranslatableError) => {
      toast.error(t(e.message, e.intlParams));
    },
  });

  const deleteAppBackup = useMutation({
    ...deleteAppBackupMutation(),
    onMutate: () => {
      deleteBackupModalDisclosure.close();
    },
    onError: (e: TranslatableError) => {
      toast.error(t(e.message, e.intlParams));
    },
  });

  const uploadBackup = useMutation({
    ...uploadBackupMutation(),
    onMutate: () => {
      uploadModalDisclosure.close();
    },
    onSuccess: () => {
      toast.success(t('APP_BACKUP_UPLOAD_SUCCESS'));
    },
    onError: () => {
      toast.error(t('APP_BACKUP_UPLOAD_ERROR'));
    },
  });

  const handleUploadConfirm = (file: File) => {
    uploadBackup.mutate({ body: { file }, path: { urn: info.urn } });
  };

  const handleRestoreClick = (backup: AppBackup) => {
    setSelectedBackup(backup);
    restoreModalDisclosure.open();
  };

  const handleDeleteClick = (backup: AppBackup) => {
    setSelectedBackup(backup);
    deleteBackupModalDisclosure.open();
  };

  const handleDownloadClick = (backup: AppBackup) => {
    window.open(`/api/backups/${info.urn}/${backup.id}/download`);
  };

  const disableActions =
    status === 'missing' ||
    status === 'backing_up' ||
    status === 'restoring' ||
    backupApp.isPending ||
    restoreAppBackup.isPending ||
    deleteAppBackup.isPending ||
    uploadBackup.isPending;

  return (
    <div className="card">
      <div className="card-header d-flex justify-content-between align-items-center">
        <div className="">
          <h3 className="h3 mb-0">{t('BACKUPS_LIST')}</h3>
        </div>
        <div className="d-flex flex-column flex-sm-row gap-2">
          <Button onClick={uploadModalDisclosure.open} disabled={disableActions}>
            {t('APP_BACKUP_UPLOAD')}
          </Button>
          <Button onClick={backupModalDisclosure.open} disabled={disableActions}>
            {t('BACKUPS_LIST_BACKUP_NOW')}
          </Button>
        </div>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('BACKUPS_LIST_ROW_TITLE_ID')}</TableHead>
            <TableHead>{t('BACKUPS_LIST_ROW_TITLE_SIZE')}</TableHead>
            <TableHead>{t('BACKUPS_LIST_ROW_TITLE_DATE')}</TableHead>
            <TableHead align="right">{t('BACKUPS_LIST_ROW_TITLE_ACTIONS')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.data.map((backup) => (
            <TableRow key={backup.id}>
              <TableCell>{backup.id}</TableCell>
              <TableCell>
                <FileSize size={backup.size} />
              </TableCell>
              <TableCell>
                <DateFormat date={new Date(backup.date)} />
              </TableCell>
              <TableCell align="right">
                <Button size="sm" variant="ghost" onClick={() => handleDownloadClick(backup)} disabled={disableActions} className="me-1">
                  {t('APP_BACKUP_DOWNLOAD')}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => handleRestoreClick(backup)} disabled={disableActions} className="me-1">
                  {t('APP_RESTORE_SUBMIT')}
                </Button>
                <Button size="sm" intent="danger" variant="ghost" onClick={() => handleDeleteClick(backup)} disabled={disableActions}>
                  {t('DELETE_BACKUP_MODAL_SUBMIT')}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="card-footer d-flex justify-content-end">
        <TablePagination
          totalPages={Math.max(1, data.lastPage)}
          currentPage={page}
          onPageChange={(p) => setPage(p)}
          onBack={() => setPage(page - 1)}
          onNext={() => setPage(page + 1)}
        />
      </div>
      <BackupAppDialog
        info={info}
        isOpen={backupModalDisclosure.isOpen}
        onClose={backupModalDisclosure.close}
        onConfirm={() => backupApp.mutate({ path: { urn: info.urn } })}
      />
      <RestoreAppDialog
        appName={info.name}
        backup={selectedBackup}
        isOpen={restoreModalDisclosure.isOpen}
        onClose={restoreModalDisclosure.close}
        onConfirm={() => selectedBackup && restoreAppBackup.mutate({ path: { urn: info.urn }, body: { filename: selectedBackup.id } })}
      />
      <DeleteAppBackupDialog
        backup={selectedBackup}
        isOpen={deleteBackupModalDisclosure.isOpen}
        onClose={deleteBackupModalDisclosure.close}
        onConfirm={() => selectedBackup && deleteAppBackup.mutate({ path: { urn: info.urn }, body: { filename: selectedBackup.id } })}
      />
      <UploadBackupDialog isOpen={uploadModalDisclosure.isOpen} onClose={uploadModalDisclosure.close} onConfirm={handleUploadConfirm} />
    </div>
  );
};
