import path from 'path';
import { handleApiError } from '@/actions/utils/handle-api-error';
import { TipiConfig } from '@/server/core/TipiConfig/TipiConfig';
import { sanitizePath } from '@runtipi/shared';
import { pathExists } from '@runtipi/shared/node';
import fs from 'fs-extra';
import { APP_DIR, DATA_DIR } from '../../../config/constants';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (typeof id !== 'string') {
      return new Response('Not found', { status: 404 });
    }

    const defaultFilePath = path.join(DATA_DIR, 'apps', sanitizePath(id), 'metadata', 'logo.jpg');
    const appRepoFilePath = path.join(DATA_DIR, 'repos', TipiConfig.getConfig().appsRepoId, 'apps', sanitizePath(id), 'metadata', 'logo.jpg');

    let filePath = path.join(APP_DIR, 'public', 'app-not-found.jpg');

    if (await pathExists(defaultFilePath)) {
      filePath = defaultFilePath;
    } else if (await pathExists(appRepoFilePath)) {
      filePath = appRepoFilePath;
    }

    const file = fs.readFileSync(filePath);

    return new Response(file, { headers: { 'content-type': 'image/jpeg', 'cache-control': 'public, max-age=86400' } });
  } catch (error) {
    return handleApiError(error);
  }
}
