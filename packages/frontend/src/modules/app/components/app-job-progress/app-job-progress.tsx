import { IconAlertTriangle, IconX } from '@tabler/icons-react';
import clsx from 'clsx';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getJobPhase, useAppJob } from './use-app-job';
import './app-job-progress.css';

export const AppJobProgress = ({ appUrn }: { appUrn: string }) => {
  const { t } = useTranslation();
  const { job, active, elapsed, canCancel, cancel, cancelling } = useAppJob(appUrn);
  const [dismissedRequest, setDismissedRequest] = useState<string | null>(null);

  if (!job || job.status === 'succeeded' || dismissedRequest === job.requestId) return null;

  const phase = getJobPhase(job);
  const title = t(job.command === 'backup' ? 'APP_JOB_BACKUP' : 'APP_JOB_UPDATE');
  const failed = job.status === 'failed';

  return (
    <section className={clsx('rt-panel rt-job', { 'rt-job--failed': failed })} aria-label={title} data-testid="app-job-progress">
      <span className={clsx('rt-job__icon', { 'rt-job__icon--run': active })} aria-hidden="true">
        {failed && <IconAlertTriangle size={16} stroke={2} />}
      </span>
      <div className="rt-job__body">
        <div className="rt-job__head">
          <h2 className="rt-job__title">{title}</h2>
          <span className="rt-job__elapsed rt-mono">
            {t('APP_JOB_ELAPSED')} {elapsed}
          </span>
        </div>
        <p className="rt-job__phase" aria-live="polite" aria-atomic="true">
          {t(`APP_JOB_PHASE_${phase}`)}
        </p>
        {active && !job.cancellable && job.status !== 'cancelling' && <p className="rt-job__note">{t('APP_JOB_FINISHING')}</p>}
        {failed && (
          <details className="rt-job__error">
            <summary>{t('APP_JOB_VIEW_ERROR')}</summary>
            <pre>{job.message}</pre>
          </details>
        )}
        {active && (
          <div className="rt-appd-bar rt-job__bar" aria-hidden="true">
            <span />
          </div>
        )}
      </div>
      {active ? (
        <button type="button" className="rt-btn rt-btn--sm" disabled={!canCancel || cancelling} onClick={cancel}>
          {t('APP_JOB_CANCEL')}
        </button>
      ) : (
        <button
          type="button"
          className="rt-icon-btn rt-job__close"
          onClick={() => setDismissedRequest(job.requestId)}
          aria-label={t('CLOSE')}
          title={t('CLOSE')}
        >
          <IconX size={16} stroke={1.8} />
        </button>
      )}
    </section>
  );
};
