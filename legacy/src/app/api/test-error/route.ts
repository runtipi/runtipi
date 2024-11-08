import { handleApiError } from '@/actions/utils/handle-api-error';

export async function GET() {
  try {
    throw new Error('API throw error test');
  } catch (error) {
    return handleApiError(error);
  }
}
