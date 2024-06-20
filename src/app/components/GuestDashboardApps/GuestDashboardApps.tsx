import { AppTile } from '@/components/AppTile';
import Link from 'next/link';

import React from 'react';
import styles from './GuestDashboardApps.module.css';
import { GetGuestDashboardApps } from '@/server/services/app-catalog/commands';

type Props = {
  apps: Awaited<ReturnType<GetGuestDashboardApps['execute']>>;
  hostname?: string;
};

export const GuestDashboardApps = (props: Props) => {
  const { apps, hostname } = props;

  const getUrl = (app: (typeof apps)[number]) => {
    if (app.domain && app.exposed) {
      return `https://${app.domain}`;
    }

    const { https } = app.info;
    const protocol = https ? 'https' : 'http';
    return `${protocol}://${hostname}:${app.info.port}${app.info.url_suffix || ''}`;
  };

  return apps.map((app) => {
    const url = getUrl(app);

    return (
      <div key={app.id} className="col-sm-6 col-lg-4">
        <Link passHref href={url} target="_blank" rel="noopener noreferrer" className={styles.link}>
          <AppTile key={app.id} app={app.info} updateAvailable={false} />
        </Link>
      </div>
    );
  });
};
