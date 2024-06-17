import React from 'react';
import { Metadata } from 'next';
import { getTranslatorFromCookie } from '@/lib/get-translator';
import { AppStoreTable } from './components/AppStoreTable';
import { appCatalog } from '@/server/services/app-catalog/app-catalog.service';

export async function generateMetadata(): Promise<Metadata> {
  const translator = await getTranslatorFromCookie();

  return {
    title: `${translator('APP_STORE_TITLE')} - Tipi`,
  };
}

export default async function AppStorePage() {
  const apps = await appCatalog.executeCommand('searchApps', { pageSize: 18 });

  return <AppStoreTable initialData={apps} />;
}
