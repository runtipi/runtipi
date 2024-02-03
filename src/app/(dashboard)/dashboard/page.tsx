import { getTranslatorFromCookie } from '@/lib/get-translator';
import { Metadata } from 'next';
import React from 'react';
import { DashboardContainer } from './components/DashboardContainer';
import { headers } from 'next/headers';

export async function generateMetadata(): Promise<Metadata> {
  const translator = await getTranslatorFromCookie();

  return {
    title: `${translator('DASHBOARD_TITLE')} - Tipi`,
  };
}

export default async function DashboardPage() {
  return <DashboardContainer />;
}
