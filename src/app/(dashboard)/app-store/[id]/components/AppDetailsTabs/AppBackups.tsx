import type { AppBackup, AppBackupsApiResponse } from '@/api/app-backups/route';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import React from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { TablePagination } from 'src/app/components/TablePagination/TablePagination';
import { BackupModal } from '../BackupModal';
import { AppInfo } from '@runtipi/shared';
import { useDisclosure } from '@/client/hooks/useDisclosure';
import { Button } from '@/components/ui/Button';
import { useAction } from 'next-safe-action/hooks';
import toast from 'react-hot-toast';
import { RestoreModal } from '../RestoreModal';
import { FileSize } from '@/components/FileSize/FileSize';
import { useAppStatus } from '@/hooks/useAppStatus';
import { DateFormat } from '@/components/DateFormat/DateFormat';
import { useTranslations } from 'next-intl';
import { DeleteBackupModal } from '../DeleteBackupModal/DeleteBackupModal';
import { createAppBackupAction } from '@/actions/backup/create-app-backup-action';
import { restoreAppBackupAction } from '@/actions/backup/restore-app-backup-action';

type Props = {
  info: AppInfo;
  initialData: AppBackupsApiResponse;
};

async function getBackupsQueryFn(params: { appId: string; page: number; pageSize: number }) {
  const url = new URL('/api/app-backups', window.location.origin);

  url.searchParams.append('appId', params.appId);

  url.searchParams.append('page', params.page.toString());
  url.searchParams.append('pageSize', params.pageSize.toString());

  const response = await fetch(url.toString());

  if (!response.ok) {
    throw new Error('Problem fetching data');
  }
  return response.json() as Promise<AppBackupsApiResponse>;
}

export const AppBackups = ({ info, initialData }: Props) => {
  const t = useTranslations();
  const [page, setPage] = React.useState(1);
  const [selectedBackup, setSelectedBackup] = React.useState<AppBackup | null>(null);
  const appStatus = useAppStatus((state) => state.statuses[info.id]) || 'missing';

  const backupModalDisclosure = useDisclosure();
  const restoreModalDisclosure = useDisclosure();
  const deleteBackupModalDisclosure = useDisclosure();

  const { data } = useQuery({
    queryKey: ['app-backups', page, info.id, initialData.total],
    queryFn: () => getBackupsQueryFn({ appId: info.id, page: page, pageSize: 5 }),
    initialData,
    placeholderData: keepPreviousData,
  });

  const backupMutation = useAction(createAppBackupAction, {
    onExecute: () => {
      backupModalDisclosure.close();
    },
    onError: ({ error }) => {
      if (error.serverError) toast.error(error.serverError);
    },
  });

  const restoreMutation = useAction(restoreAppBackupAction, {
    onExecute: () => {
      restoreModalDisclosure.close();
    },
    onError: ({ error }) => {
      if (error.serverError) toast.error(error.serverError);
    },
  });

  const handleRestoreClick = (backup: AppBackup) => {
    setSelectedBackup(backup);
    restoreModalDisclosure.open();
  };

  const handleDeleteClick = (backup: AppBackup) => {
    setSelectedBackup(backup);
    deleteBackupModalDisclosure.open();
  };

  const disableActions = appStatus === 'missing' || appStatus === 'backing_up' || appStatus === 'restoring';

  return (
    <div className="card">
      <div className="card-header d-flex justify-content-between align-items-center">
        <div className="">
          <h3 className="h3 mb-0">{t('BACKUPS_LIST')}</h3>
        </div>
        <Button
          onClick={backupModalDisclosure.open}
          variant="outline"
          intent="primary"
          disabled={disableActions}
          loading={backupMutation.status === 'executing'}
        >
          {t('BACKUPS_LIST_BACKUP_NOW')}
        </Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('BACKUPS_LIST_ROW_TITLE_ID')}</TableHead>
            <TableHead>{t('BACKUPS_LIST_ROW_TITLE_SIZE')}</TableHead>
            <TableHead>{t('BACKUPS_LIST_ROW_TITLE_DATE')}</TableHead>
            <TableHead>{t('BACKUPS_LIST_ROW_TITLE_ACTIONS')}</TableHead>
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
                <DateFormat date={backup.date} />
              </TableCell>
              <TableCell>
                <Button
                  size="sm"
                  intent="primary"
                  variant="ghost"
                  onClick={() => handleRestoreClick(backup)}
                  disabled={disableActions}
                  className="me-1"
                >
                  Restore
                </Button>
                <Button size="sm" intent="danger" variant="ghost" onClick={() => handleDeleteClick(backup)} disabled={disableActions}>
                  Delete
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
      <BackupModal
        info={info}
        isOpen={backupModalDisclosure.isOpen}
        onClose={backupModalDisclosure.close}
        onConfirm={() => backupMutation.execute({ id: info.id })}
      />
      <RestoreModal
        appName={info.name}
        backup={selectedBackup}
        isOpen={restoreModalDisclosure.isOpen}
        onClose={restoreModalDisclosure.close}
        onConfirm={() => selectedBackup && restoreMutation.execute({ id: info.id, filename: selectedBackup.id })}
      />
      <DeleteBackupModal
        backup={selectedBackup}
        isOpen={deleteBackupModalDisclosure.isOpen}
        onClose={deleteBackupModalDisclosure.close}
        onConfirm={() => selectedBackup && restoreMutation.execute({ id: info.id, filename: selectedBackup.id })}
      />
    </div>
  );
};
