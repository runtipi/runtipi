import { cancelAppJob, getAppJob } from '@/api-client';
import { Button } from '@/components/ui/Button';
import type { TranslatableError } from '@/types/error.types';
import type { AppJob } from '@runtipi/common/schemas';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { createServerClock, getJobElapsed, isJobActive } from './app-job-time';

const formatElapsed = (milliseconds: number) => {
  const seconds = Math.max(0, Math.floor(milliseconds / 1000));
  const minutes = Math.floor(seconds / 60);
  const remainder = String(seconds % 60).padStart(2, '0');

  return minutes < 60 ? `${minutes}:${remainder}` : `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, '0')}:${remainder}`;
};

export const AppJobProgress = ({ appUrn }: { appUrn: string }) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [dismissedRequest, setDismissedRequest] = useState<string | null>(null);
  const [serverClock] = useState(createServerClock);
  const [, refreshElapsed] = useState(0);

  const query = useQuery({
    queryKey: ['app-job', appUrn],
    queryFn: async () => {
      const result = await getAppJob({ path: { urn: appUrn }, query: {}, throwOnError: true });
      serverClock.observe(Date.parse(result.response.headers.get('date') ?? ''));

      return result.data.job;
    },
    refetchInterval: 5000,
  });

  const cancel = useMutation({
    mutationFn: (job: AppJob) => cancelAppJob({ path: { urn: appUrn, requestId: job.requestId }, throwOnError: true }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['app-job', appUrn] }),
    onError: (error: TranslatableError) => toast.error(t(error.message, error.intlParams)),
  });

  const job = query.data;
  const active = job ? isJobActive(job) : false;
  const updatedAt = job?.updatedAt;

  useEffect(() => {
    if (updatedAt !== undefined) serverClock.observe(updatedAt);
  }, [serverClock, updatedAt]);

  useEffect(() => {
    if (!active) return;

    const timer = setInterval(() => refreshElapsed((tick) => tick + 1), 1000);

    return () => clearInterval(timer);
  }, [active]);

  if (!job || job.status === 'succeeded' || dismissedRequest === job.requestId) return null;

  const phase = ['failed', 'cancelling', 'cancelled'].includes(job.status) ? job.status : job.phase;
  const title = t(job.command === 'backup' ? 'APP_JOB_BACKUP' : 'APP_JOB_UPDATE');
  const elapsed = formatElapsed(getJobElapsed(job, serverClock.now()));

  return (
    <section className="card mx-3 mb-3" aria-label={title}>
      <div className="card-body d-flex flex-wrap align-items-start gap-3">
        <div className="flex-fill">
          <h3 className="card-title mb-1">{title}</h3>
          <p className="text-secondary mb-1" aria-live="polite" aria-atomic="true">
            {t(`APP_JOB_PHASE_${phase}`)}
          </p>
          <small className="text-secondary">
            {t('APP_JOB_ELAPSED')}: {elapsed}
          </small>
          {active && !job.cancellable && job.status !== 'cancelling' && <p className="text-secondary mt-2 mb-0">{t('APP_JOB_FINISHING')}</p>}
          {job.status === 'failed' && (
            <details className="mt-2">
              <summary>{t('APP_JOB_VIEW_ERROR')}</summary>
              <pre className="text-danger text-break mt-2 mb-0" style={{ maxHeight: '35vh', overflowY: 'auto', whiteSpace: 'pre-wrap' }}>
                {job.message}
              </pre>
            </details>
          )}
        </div>
        {active ? (
          <Button size="sm" disabled={!job.cancellable || job.status === 'cancelling'} loading={cancel.isPending} onClick={() => cancel.mutate(job)}>
            {t('APP_JOB_CANCEL')}
          </Button>
        ) : (
          <Button size="sm" onClick={() => setDismissedRequest(job.requestId)}>
            {t('CLOSE')}
          </Button>
        )}
      </div>
    </section>
  );
};
