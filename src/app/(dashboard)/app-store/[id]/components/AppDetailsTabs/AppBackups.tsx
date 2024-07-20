import { AppBackupsApiResponse } from '@/api/app-backups/route';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { useCookies } from 'next-client-cookies';
import React from 'react';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { TablePagination } from 'src/app/components/TablePagination/TablePagination';
import { BackupModal } from '../BackupModal';
import { AppInfo } from '@runtipi/shared';
import { useDisclosure } from '@/client/hooks/useDisclosure';
import { Button } from '@/components/ui/Button';
import { useAction } from 'next-safe-action/hooks';
import { backupAppAction } from '@/actions/app-actions/backup-app-action';
import toast from 'react-hot-toast';
import { RestoreModal } from '../RestoreModal';
import { restoreBackupAction } from '@/actions/app-actions/restore-app-action';
import { useClientSettings } from '@/hooks/useClientSettings';

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
  const cookies = useCookies();
  const locale = cookies.get('tipi-locale') || 'en-US';
  const [page, setPage] = React.useState(1);
  const [restoreBackupId, setRestoreBackupId] = React.useState<string | null>(null);

  const backupModalDisclosure = useDisclosure();
  const restoreModalDisclosure = useDisclosure();
  const { timeZone } = useClientSettings();

  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ['app-backups', page, info.id],
    queryFn: () => getBackupsQueryFn({ appId: info.id, page: page, pageSize: 5 }),
    initialData,
    placeholderData: keepPreviousData,
  });

  const backupMutation = useAction(backupAppAction, {
    onExecute: () => {
      backupModalDisclosure.close();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['app-backups'] });
    },
    onError: ({ error }) => {
      if (error.serverError) toast.error(error.serverError);
    },
  });

  const restoreMutation = useAction(restoreBackupAction, {
    onExecute: () => {
      restoreModalDisclosure.close();
    },
    onError: ({ error }) => {
      if (error.serverError) toast.error(error.serverError);
    },
  });

  const handleRestoreClick = (backupId: string) => {
    setRestoreBackupId(backupId);
    restoreModalDisclosure.open();
  };

  return (
    <div className="card">
      <div className="card-header">
        <Button size="sm" onClick={backupModalDisclosure.open} intent="primary" loading={backupMutation.status === 'executing'}>
          Backup now
        </Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>size</TableHead>
            <TableHead>date</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.data.map((backup) => (
            <TableRow key={backup.id}>
              <TableCell>{backup.id}</TableCell>
              <TableCell>{backup.size}</TableCell>
              <TableCell>{new Date(backup.date).toLocaleString(locale, { timeZone })}</TableCell>
              <TableCell className="gap-2 d-flex">
                <Button size="sm" intent="secondary" onClick={() => handleRestoreClick(backup.id)}>
                  Restore
                </Button>
                <Button size="sm" intent="danger" onClick={() => restoreModalDisclosure.open()}>
                  Delete
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="card-footer">
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
        info={info}
        isOpen={restoreModalDisclosure.isOpen}
        onClose={restoreModalDisclosure.close}
        onConfirm={() => restoreMutation.execute({ id: info.id, filename: restoreBackupId! })}
      />
    </div>
  );
};
