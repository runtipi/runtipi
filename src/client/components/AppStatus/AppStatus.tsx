import clsx from 'clsx';
import React from 'react';
import { Tooltip } from 'react-tooltip';
import type { AppStatus as AppStatusEnum } from '@/server/db/schema';
import styles from './AppStatus.module.scss';

export const AppStatus: React.FC<{ status: AppStatusEnum; lite?: boolean }> = ({ status, lite }) => {
  const formattedStatus = `${status[0]?.toUpperCase()}${status.substring(1, status.length).toLowerCase()}`;

  const classes = clsx('status-dot status-gray', {
    'status-dot-animated status-green': status === 'running',
    'status-red': status === 'stopped',
  });

  return (
    <>
      {lite && <Tooltip id={formattedStatus} anchorSelect=".appStatus" place="top" />}
      <div data-tooltip-content={formattedStatus} data-tooltip-id={formattedStatus} className="appStatus d-flex align-items-center">
        <span className={classes} />
        {!lite && <span className={clsx(styles.text, 'ms-2 text-muted')}>{formattedStatus}</span>}
      </div>
    </>
  );
};
