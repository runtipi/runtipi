import * as Sentry from '@sentry/nextjs';
import { TipiConfig } from '@/server/core/TipiConfig/TipiConfig';
import { pathExists } from '@runtipi/shared/node';
import fs from 'fs-extra';
import path from 'path';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (typeof id !== 'string') {
      return new Response('Not found', { status: 404 });
    }

    const defaultFilePath = path.join(TipiConfig.getConfig().rootFolder, 'apps', id, 'metadata', 'logo.jpg');
    const appRepoFilePath = path.join(
      TipiConfig.getConfig().rootFolder,
      'repos',
      TipiConfig.getConfig().appsRepoId,
      'apps',
      id,
      'metadata',
      'logo.jpg',
    );
    let filePath = path.join('/app', 'public', 'app-not-found.jpg');

    if (await pathExists(defaultFilePath)) {
      filePath = defaultFilePath;
    } else if (await pathExists(appRepoFilePath)) {
      filePath = appRepoFilePath;
    }

    const file = fs.readFileSync(filePath);

    return new Response(file, { headers: { 'content-type': 'image/jpeg' } });
  } catch (error) {
    Sentry.captureException(error);
    return new Response('Error', { status: 500 });
  }
}
