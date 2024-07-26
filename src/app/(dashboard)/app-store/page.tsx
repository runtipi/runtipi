import React from 'react';
import { Metadata } from 'next';
import { getTranslator } from '@/lib/get-translator';
import { AppStoreTable } from './components/AppStoreTable';
import { appCatalog } from '@/server/services/app-catalog/app-catalog.service';

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
