/* eslint-disable no-console */
import fs from 'fs-extra';
import { fromPartial } from '@total-typescript/shoehorn';
import { Job } from 'bullmq';
import { tipiCache } from '@/server/core/TipiCache';
import path from 'path';
import { DATA_DIR } from '@/config/constants';
import { vi, afterAll, beforeEach } from 'vitest';

global.fetch = vi.fn();
// Mock global location
global.location = fromPartial({
  hostname: 'localhost',
});

export const waitUntilFinishedMock = vi.fn().mockResolvedValue({ success: true, stdout: '' });
vi.mock('bullmq', () => ({
  Queue: vi.fn().mockImplementation(() => ({
    add: vi.fn(() => {
      const job: Job = fromPartial({
        waitUntilFinished: waitUntilFinishedMock,
      });

      return Promise.resolve(job);
    }),
    getRepeatableJobs: vi.fn().mockResolvedValue([]),
    removeRepeatableByKey: vi.fn(),
    obliterate: vi.fn(),
    close: vi.fn(),
  })),
  QueueEvents: vi.fn().mockImplementation(() => ({
    on: vi.fn(),
    close: vi.fn(),
  })),
}));

console.error = vi.fn();

beforeEach(async () => {
  // @ts-expect-error - custom mock method
  fs.__resetAllMocks();
  await fs.promises.mkdir(path.join(DATA_DIR, 'state'), { recursive: true });
  await fs.promises.writeFile(path.join(DATA_DIR, 'state', 'settings.json'), '{}');
  await fs.promises.mkdir(path.join(DATA_DIR, 'logs'), { recursive: true });
});

afterAll(async () => {
  await tipiCache.close();
});

vi.mock('fs-extra', async () => {
  const { fsMock } = await import('@/tests/mocks/fs');
  return {
    ...fsMock,
  };
});
vi.mock('fs', async () => {
  const { fsMock } = await import('@/tests/mocks/fs');
  return {
    ...fsMock,
  };
});
vi.mock('redis', async () => {
  const { redisMock } = await import('@/tests/mocks/redis');

  return {
    ...redisMock,
  };
});

// Mock Logger
vi.mock('../../src/server/core/Logger', () => ({
  Logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('next/config', () => () => ({
  serverRuntimeConfig: {
    ...process.env,
  },
}));
