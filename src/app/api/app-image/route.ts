import { getConfig } from '@/server/core/TipiConfig/TipiConfig';
import fs from 'fs-extra';
import path from 'path';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (typeof id !== 'string') {
      return new Response('Not found', { status: 404 });
    }

    const filePath = path.join(getConfig().rootFolder, 'repos', getConfig().appsRepoId, 'apps', id, 'metadata', 'logo.jpg');
    const file = fs.readFileSync(filePath);

    return new Response(file, { headers: { 'content-type': 'image/jpeg' } });
  } catch (error) {
    return new Response('Error', { status: 500 });
  }
}
