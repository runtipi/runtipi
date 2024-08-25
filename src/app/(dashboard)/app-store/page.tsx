import { getTranslator } from '@/lib/get-translator';
import type { Metadata } from 'next';
import { AppStoreTable } from './components/AppStoreTable';
import { getClass } from 'src/inversify.config';

export async function generateMetadata(): Promise<Metadata> {
  const translator = await getTranslator();

  return {
    title: `${translator('APP_STORE_TITLE')} - Tipi`,
  };
}

export default async function AppStorePage() {
  const appCatalog = getClass('IAppCatalogService');
  const apps = await appCatalog.executeCommand('searchApps', { pageSize: 18 });

  return <AppStoreTable initialData={apps} />;
}
