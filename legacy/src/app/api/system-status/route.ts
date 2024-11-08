import { ensureUser } from '@/actions/utils/ensure-user';
import { handleApiError } from '@/actions/utils/handle-api-error';
import { fetchSystemStatus } from './fetch-system-status';

export async function GET() {
  try {
    await ensureUser();

    const data = await fetchSystemStatus();
    return new Response(JSON.stringify(data), { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}
