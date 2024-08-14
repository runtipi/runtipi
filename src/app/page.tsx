import { UnauthenticatedPage } from '@/components/UnauthenticatedPage';
import type { ISessionManager } from '@/server/common/session-manager';
import { TipiConfig } from '@/server/core/TipiConfig';
import type { IAuthQueries } from '@/server/queries/auth/auth.queries';
import { appCatalog } from '@/server/services/app-catalog/app-catalog.service';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import React from 'react';
import { container } from 'src/inversify.config';
import { EmptyPage } from './components/EmptyPage';
import { GuestDashboardApps } from './components/GuestDashboardApps';

export default async function RootPage() {
  const { guestDashboard } = TipiConfig.getConfig();

  const headersList = headers();
  const host = headersList.get('host');
  const hostname = host?.split(':')[0];

  if (guestDashboard) {
    const apps = await appCatalog.executeCommand('getGuestDashboardApps');

    return (
      <UnauthenticatedPage title="GUEST_DASHBOARD" subtitle="RUNTIPI">
        {apps.length === 0 ? (
          <EmptyPage title="GUEST_DASHBOARD_NO_APPS" subtitle="GUEST_DASHBOARD_NO_APPS_SUBTITLE" />
        ) : (
          <div className="row row-cards">
            <GuestDashboardApps apps={apps} hostname={hostname} />
          </div>
        )}
      </UnauthenticatedPage>
    );
  }

  const authQueries = container.get<IAuthQueries>('IAuthQueries');
  const sessionManager = container.get<ISessionManager>('ISessionManager');

  const isConfigured = await authQueries.getFirstOperator();

  if (!isConfigured) {
    redirect('/register');
  }

  const user = await sessionManager.getUserFromCookie();

  if (!user) {
    redirect('/login');
  }

  redirect('/dashboard');
}
