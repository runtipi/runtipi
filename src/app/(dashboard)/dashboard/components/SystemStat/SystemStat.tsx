import { IconAperture } from '@tabler/icons-react';
import clsx from 'clsx';
import React from 'react';

interface IProps {
  icon: typeof IconAperture;
  progress: number;
  title: string;
  subtitle: string;
  metric: string;
  isLoading?: boolean;
}

export const SystemStat: React.FC<IProps> = ({ icon: IconComponent, progress, title, subtitle, metric, isLoading }) => (
  <div className="col-sm-6 col-lg-4">
    <div className="card">
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-start">
          <div className={clsx('h2 mb-3 font-weight-bold', { placeholder: isLoading })}>{title}</div>
          <IconComponent />
        </div>
        <div className={clsx('h2', { 'placeholder col-3': isLoading })}>{metric}</div>
        <div className={clsx('mb-3 text-muted', { 'placeholder col-11': isLoading })}>{subtitle}</div>
        <div className="progress progress-sm">
          <div
            className="progress-bar bg-primary"
            role="progressbar"
            style={{ width: `${progress.toFixed(0)}%` }}
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="75% Complete"
          >
            <span className="visually-hidden">75% Complete</span>
          </div>
        </div>
      </div>
    </div>
  </div>
);
