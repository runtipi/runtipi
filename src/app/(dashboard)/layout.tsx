import React from 'react';
import { redirect } from 'next/navigation';
import { getUserFromCookie } from '@/server/common/session.helpers';
import { SystemServiceClass } from '@/server/services/system';
import semver from 'semver';
import clsx from 'clsx';
import { Header } from './components/Header';
import { PageTitle } from './components/PageTitle';
import styles from './layout.module.scss';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getUserFromCookie();

  if (!user) {
    redirect('/login');
  }

  const systemService = new SystemServiceClass();
  const { latest, current } = await systemService.getVersion();
  const isLatest = semver.gte(current, latest || '0.0.0');

  return (
    <div className="page">
      <Header isUpdateAvailable={!isLatest} />
      <div className="page-wrapper">
        <div className="page-header d-print-none">
          <div className="container-xl">
            <div className={clsx(styles.title, 'align-items-stretch align-items-md-center d-flex flex-column flex-md-row ')}>
              <div className="me-3 text-white">
                <PageTitle />
              </div>
              <div className="flex-fill">{}</div>
            </div>
          </div>
        </div>
        <div className="page-body">
          <div className="container-xl">{children}</div>
        </div>
      </div>
    </div>
  );
}
