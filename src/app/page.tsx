import React from 'react';
import { getUserFromCookie } from '@/server/common/session.helpers';
import { redirect } from 'next/navigation';
import { db } from '@/server/db';
import { AppServiceClass } from '@/server/services/apps/apps.service';
import { getConfig } from '@/server/core/TipiConfig';
import { AuthQueries } from '@/server/queries/auth/auth.queries';
import { UnauthenticatedPage } from '@/components/UnauthenticatedPage';
import { headers } from 'next/headers';
import { GuestDashboardApps } from './components/GuestDashboardApps';
import { EmptyPage } from './components/EmptyPage';

export const dynamic = 'force-dynamic';

export default async function RootPage() {
  const appService = new AppServiceClass(db);
  const { guestDashboard, allowAutoThemes } = getConfig();

  const headersList = headers();
  const host = headersList.get('host');
  const hostname = host?.split(':')[0];

  if (guestDashboard) {
    const apps = await appService.getGuestDashboardApps();

    return (
      <UnauthenticatedPage autoTheme={allowAutoThemes} title="guest-dashboard" subtitle="runtipi">
        {apps.length === 0 ? (
          <EmptyPage title="guest-dashboard-no-apps" subtitle="guest-dashboard-no-apps-subtitle" />
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
