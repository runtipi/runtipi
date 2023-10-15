import { TipiCache } from '@/server/core/TipiCache';

export async function GET() {
  try {
    const cache = new TipiCache('getStatus');
    const status = await cache.get('status');
    await cache.close();

    return Response.json({ success: true, status: status || 'RUNNING' });
  } catch (error) {
    return Response.json({ success: false, status: 'ERROR', error });
  }
}
