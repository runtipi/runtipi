'use client';

import clsx from 'clsx';
import React from 'react';
import { Tooltip } from 'react-tooltip';
import { useTranslations } from 'next-intl';
import styles from './AppStatus.module.scss';
import { useAppStatus } from '@/hooks/useAppStatus';

export const AppStatus: React.FC<{ appId: string; lite?: boolean }> = ({ appId, lite }) => {
  const t = useTranslations();
  const appStatus = useAppStatus((state) => state.statuses[appId] || 'missing');

  const formattedStatus = t(`APP_STATUS_${appStatus.toUpperCase() as Uppercase<typeof appStatus>}`);

  const classes = clsx('status-dot status-gray', {
    'status-dot-animated status-green': appStatus === 'running',
    'status-red': appStatus === 'stopped',
  });

  if (appStatus === 'missing') return null;

  return (
    <>
      {lite && <Tooltip className="tooltip" id={formattedStatus} anchorSelect=".appStatus" place="top" />}
      <div data-tooltip-content={formattedStatus} data-tooltip-id={formattedStatus} className="appStatus d-flex align-items-center">
        <span className={classes} />
        {!lite && <span className={clsx(styles.text, 'ms-2 text-muted')}>{formattedStatus}</span>}
      </div>
    </>
  );
};
