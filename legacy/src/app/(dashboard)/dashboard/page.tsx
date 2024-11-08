import { fetchSystemStatus } from '@/api/system-status/fetch-system-status';
import { getTranslator } from '@/lib/get-translator';
import type { Metadata } from 'next';
import { DashboardContainer } from './components/DashboardContainer';

export async function generateMetadata(): Promise<Metadata> {
  const translator = await getTranslator();

  return {
    title: `${translator('DASHBOARD_TITLE')} - Tipi`,
  };
}

export default async function DashboardPage() {
  const systemLoad = await fetchSystemStatus();

  return <DashboardContainer initialData={systemLoad} />;
}
