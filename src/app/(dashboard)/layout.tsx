import type { ISessionManager } from '@/server/common/session-manager';
import { TipiConfig } from '@/server/core/TipiConfig';
import { appCatalog } from '@/server/services/app-catalog/app-catalog.service';
import { SystemService } from '@/server/services/system';
import type { ISystemService } from '@/server/services/system/system.service';
import { isInstanceInsecure } from '@/server/utils/network';
import clsx from 'clsx';
import { redirect } from 'next/navigation';
import type React from 'react';
import semver from 'semver';
import { container } from 'src/inversify.config';
import { AtRiskBanner } from './components/AtRiskBanner/AtRiskBanner';
import { Header } from './components/Header';
import { LayoutActions } from './components/LayoutActions/LayoutActions';
import { PageTitle } from './components/PageTitle';
import { Welcome } from './components/Welcome/Welcome';
import styles from './layout.module.scss';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const systemService = container.get<ISystemService>('ISystemService');
  const sessionManager = container.get<ISessionManager>('ISessionManager');

  const user = await sessionManager.getUserFromCookie();
  const { apps } = await appCatalog.executeCommand('listApps');

  const installedApps = await appCatalog.executeCommand('getInstalledApps');
  const availableUpdates = installedApps.filter((app) => Number(app.version) < Number(app.latestVersion) && app.status !== 'updating').length;
  const { allowErrorMonitoring } = TipiConfig.getConfig();

  if (!user) {
    redirect('/login');
  }

  if (!(await SystemService.hasSeenWelcome())) {
    return <Welcome allowErrorMonitoring={allowErrorMonitoring} />;
  }

  const { latest, current } = await systemService.getVersion();

  const isLatest = semver.valid(current) && semver.valid(latest) && semver.gte(current, latest);

  return (
    <div className="page">
      <Header isUpdateAvailable={!isLatest} />
      <div className="page-wrapper">
        <div className="page-header d-print-none">
          <div className="container-xl">
            <div className={clsx(styles.title, 'row g-2 align-items-center')}>
              <div className="col text-white">
                <PageTitle apps={apps} />
              </div>
              <div className="flex-fill col-auto ms-auto d-print-none">
                <LayoutActions availableUpdates={availableUpdates} />
              </div>
            </div>
          </div>
        </div>
        <div className="page-body">
          <div className="container-xl">
            {children}
            {isInstanceInsecure() && <AtRiskBanner isInsecure />}
          </div>
        </div>
      </div>
    </div>
  );
}
