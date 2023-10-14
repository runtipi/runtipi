import { TipiCache } from '@/server/core/TipiCache';

export async function GET() {
  const cache = new TipiCache('getStatus');
  const status = (await cache.get('status')) || 'RUNNING';
  await cache.close();

  return Response.json({ success: true, status });
}
