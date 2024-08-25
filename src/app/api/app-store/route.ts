import { ensureUser } from '@/actions/utils/ensure-user';
import { handleApiError } from '@/actions/utils/handle-api-error';
import { getClass } from 'src/inversify.config';

const getApps = async (searchParams: URLSearchParams) => {
  const appCatalog = getClass('IAppCatalogService');
  const search = searchParams.get('search');
  const pageSize = searchParams.get('pageSize') || 18;
  const category = searchParams.get('category');
  const cursor = searchParams.get('cursor');

  return appCatalog.searchApps({ search, category, pageSize: Number(pageSize), cursor });
};

export async function GET(request: Request) {
  try {
    await ensureUser();

    const { searchParams } = new URL(request.url);

    const apps = await getApps(searchParams);

    return new Response(JSON.stringify(apps), { headers: { 'content-type': 'application/json' } });
  } catch (error) {
    return handleApiError(error);
  }
}

export type AppStoreApiResponse = Awaited<ReturnType<typeof getApps>>;
