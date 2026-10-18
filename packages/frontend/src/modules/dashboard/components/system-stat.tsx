import clsx from 'clsx';
import type { ReactNode } from 'react';

type Props = {
  label: ReactNode;
  /** Shown on the right of the label, e.g. "4 cores" */
  meta?: ReactNode;
  value: string;
  unit?: string;
  /** Fill of the meter in percent, hidden when undefined */
  progress?: number;
  tone?: 'default' | 'danger';
  meterTone?: 'default' | 'accent' | 'danger';
  /** Rendered between the value and the meter, usually a sparkline */
  children?: ReactNode;
  className?: string;
};

export const StatCard = ({ label, meta, value, unit, progress, tone = 'default', meterTone = 'default', children, className }: Props) => (
  <div className={clsx('rt-stat', { 'rt-stat--danger': tone === 'danger' }, className)}>
    <div className="rt-stat__head">
      <span className="rt-stat__label rt-mono">{label}</span>
      {meta && <span className="rt-stat__meta rt-mono">{meta}</span>}
    </div>
    <div className="rt-stat__value rt-display">
      {value}
      {unit && <span className="rt-stat__unit">{unit}</span>}
    </div>
    <div className="rt-stat__body">{children}</div>
    {progress !== undefined && (
      <div
        className={clsx('rt-meter', { 'rt-meter--accent': meterTone === 'accent', 'rt-meter--danger': meterTone === 'danger' })}
        role="progressbar"
        aria-valuenow={Math.round(progress)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={typeof label === 'string' ? label : undefined}
      >
        <span style={{ width: `${Math.min(Math.max(progress, 0), 100)}%` }} />
      </div>
    )}
  </div>
);
