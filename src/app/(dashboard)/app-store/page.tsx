import { AppServiceClass } from '@/server/services/apps/apps.service';
import React from 'react';
import { Metadata } from 'next';
import { getTranslatorFromCookie } from '@/lib/get-translator';
import AppStoreTile from '@/client/modules/AppStore/components/AppStoreTile/AppStoreTile';

export async function generateMetadata(): Promise<Metadata> {
  const translator = await getTranslatorFromCookie();

  return {
    title: `${translator('apps.app-store.title')} - Tipi`,
  };
}

export default async function Page() {
  const { apps } = await AppServiceClass.listApps();

  return (
    <div className="card px-3 pb-3">
      <div data-testid="app-store-table" className="row row-cards">
        {apps.map((app) => (
          <AppStoreTile key={app.id} app={app} />
        ))}
      </div>
    </div>
  );
}
