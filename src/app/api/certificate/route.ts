import * as Sentry from '@sentry/nextjs';
import { getUserFromCookie } from '@/server/common/session.helpers';
import { TipiConfig } from '@/server/core/TipiConfig/TipiConfig';
import fs from 'fs-extra';
import { APP_DATA_DIR } from 'src/config';

export async function GET() {
  try {
    const user = await getUserFromCookie();

    if (user?.operator) {
      const filePath = `${APP_DATA_DIR}/traefik/tls/cert.pem`;

      if (await fs.pathExists(filePath)) {
        const file = await fs.promises.readFile(filePath);

        return new Response(file, {
          headers: {
            'content-type': 'application/x-pem-file',
            'content-disposition': 'attachment; filename=cert.pem',
          },
        });
      }

      return new Response('File not found', { status: 404 });
    }

    return new Response('Forbidden', { status: 403 });
  } catch (error) {
    Sentry.captureException(error);
    return new Response('Error', { status: 500 });
  }
}
