import { Skeleton } from '@/components/ui/Skeleton/Skeleton';
import type { IconAperture } from '@tabler/icons-react';
import clsx from 'clsx';
import type React from 'react';
import { getSeverity, severityClass } from '../helpers/format';

interface IProps {
  icon: typeof IconAperture;
  /** Fill of the meter, in percent. The meter is hidden when undefined */
  progress?: number;
  title: string;
  subtitle: React.ReactNode;
  metric: string;
  isLoading?: boolean;
  /** Rendered below the meter, usually a sparkline */
  children?: React.ReactNode;
  className?: string;
}

export const SystemStat: React.FC<IProps> = ({ icon: IconComponent, progress, title, subtitle, metric, isLoading = false, children, className }) => (
  <div className={clsx('px-1 pt-0 pb-0', className ?? 'col-sm-6 col-lg-4')}>
    <div className="card">
      <div className="card-body d-flex flex-column">
        <div className="d-flex justify-content-between align-items-start">
          <Skeleton loading={isLoading}>
            <div className={clsx('h2 mb-3 font-weight-bold')}>{title}</div>
          </Skeleton>
          <IconComponent aria-hidden="true" />
        </div>
        <div className={clsx('h2')}>
          <Skeleton loading={isLoading}>{metric}</Skeleton>
        </div>
        <div className={clsx('mb-3 text-muted')}>
          <Skeleton loading={isLoading}>{subtitle}</Skeleton>
        </div>
        {progress !== undefined && (
          <Skeleton loading={isLoading}>
            <div className="progress progress-sm">
              <div
                className={clsx('progress-bar', severityClass[getSeverity(progress)])}
                style={{ width: `${Math.min(progress, 100).toFixed(0)}%` }}
                role="progressbar"
                aria-valuenow={Math.round(progress)}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={title}
              />
            </div>
          </Skeleton>
        )}
        {children && <div className="mt-auto pt-3">{children}</div>}
      </div>
    </div>
  </div>
);
