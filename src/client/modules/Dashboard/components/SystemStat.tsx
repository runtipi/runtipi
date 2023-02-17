import { TablerIcon } from '@tabler/icons';
import React from 'react';

interface IProps {
  icon: TablerIcon;
  progress: number;
  title: string;
  subtitle: string;
  metric: string;
}

const SystemStat: React.FC<IProps> = ({ icon: Icon, progress, title, subtitle, metric }) => (
  <div className="col-sm-6 col-lg-4">
    <div className="card">
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-start">
          <div className="h2 mb-3 font-weight-bold">{title}</div>
          <Icon />
        </div>
        <div className="h2">{metric}</div>
        <div className="mb-3 text-muted">{subtitle}</div>
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

export default SystemStat;
