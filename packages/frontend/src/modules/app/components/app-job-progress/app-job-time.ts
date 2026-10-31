import type { AppJob } from '@runtipi/common/schemas';

export const isJobActive = (job: AppJob) => ['queued', 'running', 'cancelling'].includes(job.status);

export const createServerClock = (readTime = () => performance.now()) => {
  let baseline: { serverTime: number; observedAt: number } | null = null;

  const now = () => {
    if (!baseline) return null;

    return baseline.serverTime + readTime() - baseline.observedAt;
  };

  const observe = (serverTime: number) => {
    if (!Number.isFinite(serverTime)) return;

    const current = now();
    baseline = { serverTime: Math.max(serverTime, current ?? serverTime), observedAt: readTime() };
  };

  return { now, observe };
};

export const getJobElapsed = (job: AppJob, serverNow: number | null) => {
  let end = job.updatedAt;

  if (isJobActive(job) && serverNow !== null) {
    end = Math.max(end, serverNow);
  }

  return Math.max(0, end - job.startedAt);
};
