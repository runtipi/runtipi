import { AppServiceClass } from '@/server/services/apps/apps.service';
import React from 'react';
import { Metadata } from 'next';
import { db } from '@/server/db';
import { TipiConfig } from '@/server/core/TipiConfig';
import { ErrorPage } from '@/components/ui/ErrorPage';
import { getTranslatorFromCookie } from '@/lib/get-translator';
import { MessageKey, TranslatedError } from '@/server/utils/errors';
import { AppDetailsWrapper } from './components/AppDetailsContainer';

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  return {
    title: `${params.id} - Tipi`,
  };
}

export default async function AppDetailsPage({ params }: { params: { id: string } }) {
  const appsService = new AppServiceClass(db);
  try {
    const app = await appsService.getApp(params.id);
    const settings = TipiConfig.getSettings();

    return <AppDetailsWrapper app={app} localDomain={settings.localDomain} />;
  } catch (e) {
    const translator = await getTranslatorFromCookie();

    if (e instanceof TranslatedError) {
      return <ErrorPage error={translator(e.message as MessageKey, { id: params.id })} />;
    }

    if (e instanceof Error) {
      return <ErrorPage error={e.message} />;
    }

    return <ErrorPage error={JSON.stringify(e)} />;
  }
}
