import { getTranslatorFromCookie } from '@/lib/get-translator';
import { Metadata } from 'next';
import React from 'react';
import { DashboardContainer } from './components/DashboardContainer';

export async function generateMetadata(): Promise<Metadata> {
  const translator = await getTranslatorFromCookie();

  return {
    title: `${translator('dashboard.title')} - Tipi`,
  };
}

export default async function DashboardPage() {
  return <DashboardContainer />;
}
