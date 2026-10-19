import { Header } from '@/components/header/header';
import type { PropsWithChildren } from 'react';
import './layout.css';
import { PageTitle } from '@/components/page-title/page-title';
import { Welcome } from '@/components/welcome/welcome';
import { useAppContext } from '@/context/app-context';
import { useLocation, useMatches } from 'react-router';
import { AppShell } from '../app-shell/app-shell';
import { TopBar } from '../app-shell/top-bar';

/**
 * Route modules export `handle = { ownHeader: true }` when they render their own top bar and page header.
 */
export type RouteHandle = { ownHeader?: boolean };

export const DashboardLayoutSuspense = ({ children }: PropsWithChildren) => {
  return (
    <div className="page">
      <Header isLoggedIn={false} isUpdateAvailable={false} allowAutoThemes={false} />
      <div className="page-wrapper">
        <div className="page-body">
          <div className="container-xl">
            <div className="card px-3 pb-3">{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const DashboardLayout = ({ children }: PropsWithChildren) => {
  const { userSettings, user, apps } = useAppContext();
  const matches = useMatches();
  const { pathname } = useLocation();
  const ownHeader = matches.some((match) => (match.handle as RouteHandle | undefined)?.ownHeader);

  if (!user.hasSeenWelcome) {
    return <Welcome allowErrorMonitoring={userSettings.allowErrorMonitoring} />;
  }

  // Keyed by path so every navigation plays the page enter animation
  return (
    <AppShell>
      <div key={pathname} className="rt-page-enter">
        {!ownHeader && (
          <>
            <TopBar />
            <div className="rt-default-header">
              <PageTitle apps={apps} />
            </div>
          </>
        )}
        <div className="rt-page-content">{children}</div>
      </div>
    </AppShell>
  );
};
