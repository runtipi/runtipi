import { ensureUser } from '@/actions/utils/ensure-user';
import { handleApiError } from '@/actions/utils/handle-api-error';
import { appBackupService } from '@/server/services/app-backup/app-backup.service';
import { TranslatedError } from '@/server/utils/errors';

const getAppBackups = async (searchParams: URLSearchParams) => {
  const appId = searchParams.get('appId');
  const pageSize = searchParams.get('pageSize') || 10;
  const page = searchParams.get('page') || 1;

  if (!appId) {
    throw new TranslatedError('APP_ERROR_APP_NOT_FOUND', { id: appId });
  }

  return appBackupService.executeCommand('getAppBackups', { appId, pageSize: Number(pageSize), page: Number(page) });
};

export async function GET(request: Request) {
  try {
    await ensureUser();

    const { searchParams } = new URL(request.url);

    const backups = await getAppBackups(searchParams);

    return new Response(JSON.stringify(backups), { headers: { 'content-type': 'application/json' } });
  } catch (error) {
    return handleApiError(error);
  }
}

export type AppBackupsApiResponse = Awaited<ReturnType<typeof getAppBackups>>;

export type AppBackup = AppBackupsApiResponse['data'][number];
