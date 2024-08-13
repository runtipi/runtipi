import { handleApiError } from '@/actions/utils/handle-api-error';
import { getUserFromCookie } from '@/server/common/session.helpers';
import fs from 'fs-extra';
import { DATA_DIR } from '../../../config/constants';

export async function GET() {
  try {
    const user = await getUserFromCookie();

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
