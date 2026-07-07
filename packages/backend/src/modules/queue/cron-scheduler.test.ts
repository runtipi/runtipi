import { afterEach, describe, expect, it, vi } from 'vitest';
import { getNextCronDelay, scheduleCron, validateCronPattern } from './cron-scheduler';

describe('cron-scheduler', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('accepts standard cron patterns', () => {
    expect(validateCronPattern('*/5 * * * *')).toBe(true);
    expect(validateCronPattern('*/15 * * * *')).toBe(true);
    expect(validateCronPattern('*/60 * * * *')).toBe(true);
    expect(validateCronPattern('* * * * *')).toBe(true);
    expect(validateCronPattern('0 3 * * *')).toBe(true);
  });

  it('rejects invalid cron patterns', () => {
    expect(validateCronPattern('*/0 * * * *')).toBe(false);
    expect(validateCronPattern('60 * * * *')).toBe(false);
    expect(validateCronPattern('not cron')).toBe(false);
  });

  it('calculates the next matching minute without catch-up loops', () => {
    const delay = getNextCronDelay('*/15 * * * *', new Date(2026, 0, 1, 12, 7, 30));

    expect(delay).toBe(7.5 * 60_000);
  });

  it('handles spring DST jumps by scheduling the next real wall-clock minute', () => {
    const delay = getNextCronDelay('*/5 * * * *', new Date('2026-03-29T00:59:30.000Z'), 'Europe/Zurich');

    expect(delay).toBe(30_000);
  });

  it('runs repeatable tasks once per matching minute', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 1, 12, 7, 30));

    const task = vi.fn();
    const scheduledTask = scheduleCron('*/5 * * * *', task);

    await vi.advanceTimersByTimeAsync(2.5 * 60_000);
    expect(task).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(5 * 60_000);
    expect(task).toHaveBeenCalledTimes(2);

    scheduledTask.stop();
    await vi.advanceTimersByTimeAsync(10 * 60_000);
    expect(task).toHaveBeenCalledTimes(2);
  });

  it('waits through delays longer than the Node timer limit', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 2, 0, 0, 0));

    const task = vi.fn();
    const scheduledTask = scheduleCron('0 0 1 * *', task);

    await vi.advanceTimersByTimeAsync(2_147_483_647);
    expect(task).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(30 * 24 * 60 * 60 * 1000 - 2_147_483_647);
    expect(task).toHaveBeenCalledTimes(1);

    scheduledTask.stop();
  });
});
