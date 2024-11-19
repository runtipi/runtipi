import clsx from 'clsx';
import type React from 'react';
import { Tooltip } from 'react-tooltip';
import type { AppStatus as AppStatusType } from '@/types/app.types';
import { useTranslation } from 'react-i18next';

export const AppStatus: React.FC<{ lite?: boolean; status: AppStatusType }> = ({ status, lite }) => {
  const { t } = useTranslation();

  const formattedStatus = t(`APP_STATUS_${status.toUpperCase()}`);

  const classes = clsx('status-dot status-gray', {
    'status-dot-animated status-green': status === 'running',
    'status-red': status === 'stopped',
  });

  if (status === 'missing') return null;

  return (
    <>
      {lite && <Tooltip className="tooltip" id={formattedStatus} anchorSelect=".appStatus" place="top" />}
      <div data-tooltip-content={formattedStatus} data-tooltip-id={formattedStatus} className="appStatus d-flex align-items-center">
        <span className={classes} />
        {!lite && <span className={clsx('ms-2 text-muted')}>{formattedStatus}</span>}
      </div>
    </>
  );
};
