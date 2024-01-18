import { getTranslatorFromCookie } from '@/lib/get-translator';
import { SystemServiceClass } from '@/server/services/system';
import { Metadata } from 'next';
import React from 'react';
import { DashboardContainer } from './components/DashboardContainer';

export async function generateMetadata(): Promise<Metadata> {
  const translator = await getTranslatorFromCookie();

  return {
    title: `${translator('DASHBOARD_TITLE')} - Tipi`,
  };
}

export default async function DashboardPage() {
  const { diskUsed, diskSize, percentUsed, cpuLoad, memoryTotal, percentUsedMemory } = SystemServiceClass.systemInfo();

  return (
    <DashboardContainer
      diskUsed={diskUsed}
      diskSize={diskSize}
      percentUsed={percentUsed}
      cpuLoad={cpuLoad}
      memoryTotal={memoryTotal}
      percentUsedMemory={percentUsedMemory}
    />
  );
}
