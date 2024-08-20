import { getTranslator } from '@/lib/get-translator';
import { appCatalog } from '@/server/services/app-catalog/app-catalog.service';
import type { Metadata } from 'next';
import { AppStoreTable } from './components/AppStoreTable';

export async function generateMetadata(): Promise<Metadata> {
  const translator = await getTranslator();

  return {
    title: `${translator('APP_STORE_TITLE')} - Tipi`,
  };
}

export default async function AppStorePage() {
  const apps = await appCatalog.executeCommand('searchApps', { pageSize: 18 });

  return <AppStoreTable initialData={apps} />;
}
