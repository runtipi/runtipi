import { Header } from '@/components/header/header';
import type { PropsWithChildren } from 'react';
import semver from 'semver';
import './layout.css';
import { PageTitle } from '@/components/page-title/page-title';
import { Welcome } from '@/components/welcome/welcome';
import { useAppContext } from '@/context/app-context';
import { useUserContext } from '@/context/user-context';

export const DashboardLayoutSuspense = ({ children }: PropsWithChildren) => {
  return (
    <div className="page">
      <Header isLoggedIn={false} isUpdateAvailable={false} allowAutoThemes={false} />
      <div className="page-wrapper">
        <div className="page-header d-print-none">
          <span className="title" />
        </div>
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
  const { userSettings, user, apps, version } = useAppContext();

  const { isLoggedIn } = useUserContext();

  let isLatest = semver.valid(version.current) && semver.valid(version.latest) && semver.gte(version.current, version.latest);

  if (version.current === 'nightly') {
    isLatest = true;
  }

  if (!user.hasSeenWelcome) {
    return <Welcome allowErrorMonitoring={userSettings.allowErrorMonitoring} />;
  }

  return (
    <div className="page">
      <Header isLoggedIn={isLoggedIn} isUpdateAvailable={!isLatest} allowAutoThemes={userSettings.allowAutoThemes} />
      <div className="page-wrapper">
        <div className="page-header d-print-none">
          <div className="container-xl">
            <div className="text-white title">
              <PageTitle apps={apps} />
            </div>
          </div>
        </div>
        <div className="page-body">
          <div className="container-xl">{children}</div>
        </div>
      </div>
    </div>
  );
};
