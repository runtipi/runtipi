import React from 'react';
import { toast } from 'react-hot-toast';
import { PaginationState, SortingState, createColumnHelper } from '@tanstack/react-table';
import { DataTable } from '@/components/ui/DataTable/DataTable';
import { Backup } from '@/server/db/schema';
import { trpc } from '@/utils/trpc';
import { Button } from '@/components/ui/Button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/DropdownMenu';

const columnHelper = createColumnHelper<Backup>();

const getBestUnit = (sizeInBytes: bigint) => {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];

  let unitIndex = 0;
  let size = Number(sizeInBytes);

  while (size > 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  return `${Math.round(size * 100) / 100} ${units[unitIndex]}`;
};

type IProps = {
  id: string;
};

const getColumns = (onDownload: (id: string) => void, onRestore: (id: string) => void, onDelete: (id: string) => void) => {
  return [
    columnHelper.accessor('filename', {
      cell: (info) => info.getValue(),
      enableSorting: false,
    }),
    columnHelper.accessor('version', {
      id: 'version',
      cell: (info) => <b>{info.getValue()}</b>,
      header: () => <span>Version</span>,
      enableSorting: false,
    }),
    columnHelper.accessor('size', {
      id: 'size',
      cell: (info) => <span>{getBestUnit(info.getValue())}</span>,
      header: () => <span>Size</span>,
      enableSorting: false,
    }),
    columnHelper.accessor((row) => row.createdAt, {
      id: 'date',
      cell: (info) => <span>{new Date(info.getValue()).toLocaleString()}</span>,
      header: () => <span>Date</span>,
      enableSorting: false,
    }),
    columnHelper.accessor('id', {
      id: 'actions',
      cell: (cell) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button>
              <span>Actions</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuLabel>Action</DropdownMenuLabel>
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={() => onDownload(cell.row.getValue('filename'))}>Download</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onRestore(cell.row.getValue('filename'))}>Restore</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDelete(cell.row.getValue('filename'))}>Delete</DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
      header: () => <span>Actions</span>,
      enableSorting: false,
    }),
  ];
};

export const BackupsList: React.FC<IProps> = ({ id }) => {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [{ pageIndex, pageSize }, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const context = trpc.useContext();

  const defaultData = React.useMemo(() => [], []);
  const { data, isFetched, isFetching } = trpc.app.listBackups.useQuery({ pageIndex, pageSize, id });
  const { mutate, isLoading } = trpc.app.backupApp.useMutation({
    onSuccess: () => {
      context.app.listBackups.invalidate({ pageIndex, pageSize, id });
      toast.success('Backup created');
    },
  });

  const renderTableActions = () => {
    return (
      <Button onClick={() => mutate({ id })} loading={isLoading}>
        Backup now
      </Button>
    );
  };

  const downloadBackup = async (filename: string) => {
    alert(`Download ${filename}`);
  };

  const restoreBackup = async (filename: string) => {
    alert(`Restore ${filename}`);
  };

  const deleteBackup = async (filename: string) => {
    alert(`Delete ${filename}`);
  };

  const columns = React.useMemo(() => getColumns(downloadBackup, restoreBackup, deleteBackup), []);

  return (
    <DataTable
      tableActions={renderTableActions()}
      data={data?.data || defaultData}
      total={data?.total || 0}
      pagination={{ pageSize, pageIndex }}
      pageCount={data?.pageCount || 0}
      columns={columns}
      sorting={sorting}
      onSortingChange={setSorting}
      onPaginationChange={setPagination}
      loading={isFetching && !isFetched}
    />
  );
};
