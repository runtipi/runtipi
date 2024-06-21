import 'server-only';

import React from 'react';
import { Metadata } from 'next';
import { TipiConfig } from '@/server/core/TipiConfig';
import { ErrorPage } from '@/components/ui/ErrorPage';
import { getTranslatorFromCookie } from '@/lib/get-translator';
import { MessageKey, TranslatedError } from '@/server/utils/errors';
import { appCatalog } from '@/server/services/app-catalog/app-catalog.service';
import { AppDetailsContainer } from './components/AppDetailsContainer/AppDetailsContainer';

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  return {
    title: `${params.id} - Tipi`,
  };
}

export default async function AppDetailsPage({ params }: { params: { id: string } }) {
  try {
    const app = await appCatalog.executeCommand('getApp', params.id);
    const settings = TipiConfig.getSettings();

    return <AppDetailsContainer app={app} localDomain={settings.localDomain} />;
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
