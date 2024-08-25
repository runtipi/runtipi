import { ErrorPage } from '@/components/ui/ErrorPage';
import { getTranslator } from '@/lib/get-translator';
import { TipiConfig } from '@/server/core/TipiConfig';
import { type MessageKey, TranslatedError } from '@/server/utils/errors';
import type { Metadata } from 'next';
import { AppDetailsContainer } from './components/AppDetailsContainer/AppDetailsContainer';
import { getClass } from 'src/inversify.config';

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  return {
    title: `${params.id} - Tipi`,
  };
}

export default async function AppDetailsPage({ params }: { params: { id: string } }) {
  try {
    const appCatalog = getClass('IAppCatalogService');
    const appBackupService = getClass('IAppBackupService');

    const app = await appCatalog.getApp(params.id);
    const backups = await appBackupService.executeCommand('getAppBackups', { appId: params.id, pageSize: 5, page: 1 });
    const settings = TipiConfig.getSettings();

    return <AppDetailsContainer app={app} localDomain={settings.localDomain} backups={backups} />;
  } catch (e) {
    const translator = await getTranslator();

    if (e instanceof TranslatedError) {
      return <ErrorPage error={translator(e.message as MessageKey, { id: params.id })} />;
    }

    if (e instanceof Error) {
      return <ErrorPage error={e.message} />;
    }

    return <ErrorPage error={JSON.stringify(e)} />;
  }
}
