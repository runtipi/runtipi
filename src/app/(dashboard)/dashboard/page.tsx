import { getTranslatorFromCookie } from '@/lib/get-translator';
import { SystemServiceClass } from '@/server/services/system';
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
  const data = SystemServiceClass.systemInfo();
  const { disk, memory, cpu } = data;

  // Convert bytes to GB
  const diskFree = Math.round(disk.available / 1024 / 1024 / 1024);
  const diskSize = Math.round(disk.total / 1024 / 1024 / 1024);
  const diskUsed = diskSize - diskFree;
  const percentUsed = Math.round((diskUsed / diskSize) * 100);

  const memoryTotal = Math.round(Number(memory.total) / 1024 / 1024 / 1024);
  const memoryFree = Math.round(Number(memory.available) / 1024 / 1024 / 1024);
  const percentUsedMemory = Math.round(((memoryTotal - memoryFree) / memoryTotal) * 100);

  return <DashboardContainer diskUsed={diskUsed} diskSize={diskSize} percentUsed={percentUsed} cpuLoad={cpu.load} memoryTotal={memoryTotal} percentUsedMemory={percentUsedMemory} />;
}
