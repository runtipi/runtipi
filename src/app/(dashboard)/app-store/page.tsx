import { AppServiceClass } from '@/server/services/apps/apps.service';
import React from 'react';
import { Metadata } from 'next';
import { getTranslatorFromCookie } from '@/lib/get-translator';
import { AppStoreTable } from './components/AppStoreTable';

export async function generateMetadata(): Promise<Metadata> {
  const translator = await getTranslatorFromCookie();

  return {
    title: `${translator('apps.app-store.title')} - Tipi`,
  };
}

export default async function AppStorePage() {
  const { apps } = await AppServiceClass.listApps();

  return (
    <div className="card px-3 pb-3">
      <AppStoreTable data={apps} />
    </div>
  );
}
