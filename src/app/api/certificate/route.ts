import { handleApiError } from '@/actions/utils/handle-api-error';
import type { ISessionManager } from '@/server/common/session-manager';
import fs from 'fs-extra';
import { container } from 'src/inversify.config';
import { DATA_DIR } from '../../../config/constants';

export async function GET() {
  try {
    const sessionManager = container.get<ISessionManager>('ISessionManager');
    const user = await sessionManager.getUserFromCookie();

    if (user?.operator) {
      const filePath = `${DATA_DIR}/traefik/tls/cert.pem`;

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
    return handleApiError(error);
  }
}
