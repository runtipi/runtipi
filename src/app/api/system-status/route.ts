import * as Sentry from '@sentry/nextjs';
import { ensureUser } from '@/actions/utils/ensure-user';
import { fetchSystemStatus } from './fetch-system-status';

export async function GET() {
  try {
    await ensureUser();

    const data = await fetchSystemStatus();
    return new Response(JSON.stringify(data), { status: 200 });
  } catch (error) {
    Sentry.captureException(error);
    return new Response('Error', { status: 500 });
  }
}
