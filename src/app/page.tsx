import { UnauthenticatedPage } from '@/components/UnauthenticatedPage';
import { TipiConfig } from '@/server/core/TipiConfig';
import { appCatalog } from '@/server/services/app-catalog/app-catalog.service';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getClass } from 'src/inversify.config';
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

  const authQueries = getClass('IAuthQueries');
  const sessionManager = getClass('ISessionManager');

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
