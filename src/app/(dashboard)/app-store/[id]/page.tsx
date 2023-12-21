import { AppServiceClass } from '@/server/services/apps/apps.service';
import React from 'react';
import { Metadata } from 'next';
import { db } from '@/server/db';
import { getSettings } from '@/server/core/TipiConfig';
import { AppDetailsWrapper } from './components/AppDetailsContainer';

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {

  return {
    title: `${params.id} - Tipi`,
  };
}

export default async function AppDetailsPage({ params }: { params: { id: string } }) {
  const appsService = new AppServiceClass(db);
  const app = await appsService.getApp(params.id);
  const settings = getSettings();

  return <AppDetailsWrapper app={app} localDomain={settings.localDomain} />;
}