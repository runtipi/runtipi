import { CronExpressionParser } from 'cron-parser';

type CronTask = () => void | Promise<void>;

export type ScheduledCronTask = {
  stop: () => void;
};

function getLocalTimeZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

export function validateCronPattern(pattern: string) {
  try {
    CronExpressionParser.parse(pattern, { currentDate: new Date(), tz: getLocalTimeZone() });
    return true;
  } catch {
    return false;
  }
}

export function getNextCronDelay(pattern: string, now = new Date(), timeZone = getLocalTimeZone()) {
  try {
    const interval = CronExpressionParser.parse(pattern, { currentDate: now, tz: timeZone });
    const nextRun = interval.next().toDate();
    return Math.max(0, nextRun.getTime() - now.getTime());
  } catch {
    throw new Error('Invalid cron pattern');
  }
}

export function scheduleCron(pattern: string, task: CronTask): ScheduledCronTask {
  if (!validateCronPattern(pattern)) {
    throw new Error('Invalid cron pattern');
  }

  let timeout: NodeJS.Timeout | undefined;
  let stopped = false;

  const scheduleNextRun = () => {
    if (stopped) {
      return;
    }

    timeout = setTimeout(async () => {
      try {
        await task();
      } finally {
        scheduleNextRun();
      }
    }, getNextCronDelay(pattern));
  };

  scheduleNextRun();

  return {
    stop: () => {
      stopped = true;
      if (timeout) {
        clearTimeout(timeout);
      }
    },
  };
}
