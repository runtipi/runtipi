import type { AppJob } from '@runtipi/common/schemas';
import { afterEach, expect, test, vi } from 'vitest';
import { createServerClock, getJobElapsed } from './app-job-time';

afterEach(() => vi.useRealTimers());

const job: AppJob = {
  requestId: '9b79d81b-71f3-4077-bb89-4e6b7d898bd2',
  appUrn: 'demo:store',
  command: 'backup',
  status: 'running',
  phase: 'archiving',
  cancellable: true,
  startedAt: 1_000_000,
  updatedAt: 1_010_000,
  message: '',
};

test.each([-3_600_000, 3_600_000])('elapsed time ignores a browser clock skew of %i ms', (skew) => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(job.updatedAt + skew);
  let monotonicTime = 100;
  const clock = createServerClock(() => monotonicTime);

  clock.observe(job.updatedAt);
  expect(getJobElapsed(job, clock.now())).toBe(10_000);

  monotonicTime += 3000;
  expect(getJobElapsed(job, clock.now())).toBe(13_000);
});

test('a current server response date accounts for time since the last progress event', () => {
  const clock = createServerClock(() => 0);

  clock.observe(Date.parse('Thu, 01 Jan 1970 00:17:00 GMT'));
  clock.observe(job.updatedAt);

  expect(getJobElapsed(job, clock.now())).toBe(20_000);
});

test('unchanged progress and response dates cannot reset elapsed time between polls', () => {
  let monotonicTime = 0;
  const clock = createServerClock(() => monotonicTime);
  clock.observe(job.updatedAt);

  monotonicTime += 5000;
  clock.observe(job.updatedAt);
  monotonicTime += 5000;

  expect(getJobElapsed(job, clock.now())).toBe(20_000);
});

test('invalid response dates preserve the clock calibrated from progress', () => {
  const clock = createServerClock(() => 0);
  clock.observe(job.updatedAt);
  clock.observe(Number.NaN);

  expect(getJobElapsed(job, clock.now())).toBe(10_000);
});

test.each(['queued', 'running', 'cancelling'] as const)('elapsed time continues advancing while %s', (status) => {
  expect(getJobElapsed({ ...job, status }, job.updatedAt + 5000)).toBe(15_000);
});

test.each(['succeeded', 'failed', 'cancelled'] as const)('elapsed time stays frozen after the job is %s', (status) => {
  expect(getJobElapsed({ ...job, status }, job.updatedAt + 5000)).toBe(10_000);
});
