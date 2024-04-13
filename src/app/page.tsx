import React from 'react';
import { getUserFromCookie } from '@/server/common/session.helpers';
import { redirect } from 'next/navigation';
import { db } from '@/server/db';
import { appService } from '@/server/services/apps/apps.service';
import { TipiConfig } from '@/server/core/TipiConfig';
import { AuthQueries } from '@/server/queries/auth/auth.queries';
import { UnauthenticatedPage } from '@/components/UnauthenticatedPage';
import { headers } from 'next/headers';
import { GuestDashboardApps } from './components/GuestDashboardApps';
import { EmptyPage } from './components/EmptyPage';

export default async function RootPage() {
  const { guestDashboard } = await TipiConfig.getConfig();

  const headersList = headers();
  const host = headersList.get('host');
  const hostname = host?.split(':')[0];

  if (guestDashboard) {
    const apps = await appService.getGuestDashboardApps();

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

  const authQueries = new AuthQueries(db);

  const isConfigured = await authQueries.getFirstOperator();

  if (!isConfigured) {
    redirect('/register');
  }

  const user = await getUserFromCookie();

  if (!user) {
    redirect('/login');
  }

  redirect('/dashboard');
}
