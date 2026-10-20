import { cancelAppJob, getAppJob } from '@/api-client';
import type { TranslatableError } from '@/types/error.types';
import type { AppJob } from '@runtipi/common/schemas';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { createServerClock, getJobElapsed, isJobActive } from './app-job-time';

export const formatElapsed = (milliseconds: number) => {
  const seconds = Math.max(0, Math.floor(milliseconds / 1000));
  const minutes = Math.floor(seconds / 60);
  const remainder = String(seconds % 60).padStart(2, '0');

  return minutes < 60 ? `${minutes}:${remainder}` : `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, '0')}:${remainder}`;
};

/** The phase to show, terminal statuses take over the last phase */
export const getJobPhase = (job: AppJob) => (['failed', 'cancelling', 'cancelled'].includes(job.status) ? job.status : job.phase);

/**
 * The latest backup or update job of an app. Progress comes from the server events (see SSEProvider),
 * polling catches up when an event is missed.
 */
export const useAppJob = (appUrn: string) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

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

  const job = query.data ?? null;
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

  return {
    job,
    active,
    elapsed: job ? formatElapsed(getJobElapsed(job, serverClock.now())) : '0:00',
    canCancel: Boolean(job && active && job.cancellable && job.status !== 'cancelling'),
    cancel: () => job && cancel.mutate(job),
    cancelling: cancel.isPending || job?.status === 'cancelling',
  };
};
