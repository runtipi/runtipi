import type { GetAppBackupsDto } from '@/api-client';

export const getAppBackupsFn = async ({ page, pageSize, appId }: { page: number; pageSize: number; appId: string }) => {
  const url = new URL(`/api/backups/${appId}`, window.location.origin);

  url.searchParams.append('page', page.toString());
  url.searchParams.append('pageSize', pageSize.toString());

  const response = await fetch(url.toString());

  if (!response.ok) {
    throw new Error('Problem fetching data');
  }
  return response.json() as Promise<GetAppBackupsDto>;
};
