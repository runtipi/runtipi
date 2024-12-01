import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import type { AppStore } from '@/types/app.types';
import { AddAppStoreDialog } from '../add-app-store-dialog/add-app-store-dialog';
import { DeleteAppStoreDialog } from '../delete-app-store-dialog/delete-app-store-dialog';
import { EditAppStoreDialog } from '../edit-app-store-dialog/edit-app-store-dialog';

type Props = {
  appStores: AppStore[];
};

export const AppStoresTable = ({ appStores }: Props) => {
  if (!appStores.length) {
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>No repositories found :(</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow className="d-flex justify-content-center text-center">
            <TableCell className="text-muted mt-2">No repositories found :(</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    );
  }

  return (
    <div className="d-flex flex-column">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>URL</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {appStores.map((appStore) => (
            <TableRow key={appStore.id}>
              <TableCell>{appStore.name}</TableCell>
              <TableCell>
                <a href={appStore.url} target="_blank" rel="noreferrer">
                  {appStore.url}
                </a>
              </TableCell>
              <TableCell className="d-flex flex-row">
                <EditAppStoreDialog appStore={appStore} />
                <DeleteAppStoreDialog appStore={appStore} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <AddAppStoreDialog />
    </div>
  );
};
