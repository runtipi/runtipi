import * as Sentry from '@sentry/nextjs';
import { getUserFromCookie } from '@/server/common/session.helpers';
import { TipiConfig } from '@/server/core/TipiConfig/TipiConfig';
import * as jwt from 'jsonwebtoken';

export async function GET() {
  try {
    const user = await getUserFromCookie();

    if (user?.operator) {
      const jwtSecret = TipiConfig.getConfig().jwtSecret;
      const token = jwt.sign({ skill: 'issue' }, jwtSecret);
      const response = await fetch('http://tipi-worker:3000/worker-api/system-status', {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data: any = await response.json();
      return new Response(JSON.stringify(data.message), { status: 200 });
    }

    return new Response('Forbidden', { status: 403 });
  } catch (error: any) {
    Sentry.captureException(error);
    return new Response('Error', { status: 500 });
  }
}
