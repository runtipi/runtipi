import { DashboardContainer } from '@/client/modules/Dashboard/containers';
import { useUIStore } from '@/client/state/uiStore';
import { SystemServiceClass } from '@/server/services/system';
import { Metadata } from 'next';
import React from 'react';

export async function generateMetadata(): Promise<Metadata> {
  const { translator } = useUIStore.getState();
  return {
    title: `${translator('dashboard.title')} - Tipi`,
  };
}

export default async function Page() {
  const data = SystemServiceClass.systemInfo();

  return <DashboardContainer data={data} isLoading={false} />;
}
