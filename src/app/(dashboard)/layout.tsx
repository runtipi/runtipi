import React from 'react';
import { redirect } from 'next/navigation';
import { getUserFromCookie } from '@/server/common/session.helpers';
import { SystemServiceClass } from '@/server/services/system';
import semver from 'semver';
import clsx from 'clsx';
import { appService } from '@/server/services/apps/apps.service';
import { TipiConfig } from '@/server/core/TipiConfig';
import { isInstanceInsecure } from '@/server/utils/network';
import { Header } from './components/Header';
import { PageTitle } from './components/PageTitle';
import styles from './layout.module.scss';
import { LayoutActions } from './components/LayoutActions/LayoutActions';
import { Welcome } from './components/Welcome/Welcome';
import { AtRiskBanner } from './components/AtRiskBanner/AtRiskBanner';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getUserFromCookie();
  const { apps } = await appService.listApps();

  const installedApps = await appService.installedApps();
  const availableUpdates = installedApps.filter((app) => Number(app.version) < Number(app.latestVersion) && app.status !== 'updating').length;
  const { allowErrorMonitoring } = TipiConfig.getConfig();

  if (!user) {
    redirect('/login');
  }

  if (!(await SystemServiceClass.hasSeenWelcome())) {
    return <Welcome allowErrorMonitoring={allowErrorMonitoring} />;
  }

  const systemService = new SystemServiceClass();
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
