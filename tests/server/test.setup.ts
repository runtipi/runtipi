/* eslint-disable no-console */
import 'reflect-metadata';
import fs from 'fs-extra';
import { fromPartial } from '@total-typescript/shoehorn';
import type { Job } from 'bullmq';
import path from 'node:path';
import { DATA_DIR } from '@/config/constants';
import { vi, afterAll, beforeEach } from 'vitest';
import { container } from 'src/inversify.config';
import type { ITipiCache } from '@/server/core/TipiCache/TipiCache';

let cookieStore: Record<string, string> = {};
vi.mock('next/headers', () => {
  return {
    cookies: vi.fn(() => ({
      set: (name: string, value: string) => {
        cookieStore[name] = value;
      },
      get: (name: string) => {
        return cookieStore[name];
      },
    })),
  };
});

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
  const tipiCache = container.get<ITipiCache>('ITipiCache');

  // @ts-expect-error - custom mock method
  fs.__resetAllMocks();
  await fs.promises.mkdir(path.join(DATA_DIR, 'state'), { recursive: true });
  await fs.promises.writeFile(path.join(DATA_DIR, 'state', 'settings.json'), '{}');
  await fs.promises.mkdir(path.join(DATA_DIR, 'logs'), { recursive: true });
  await tipiCache.clear();
  cookieStore = {};
});

afterAll(async () => {
  const tipiCache = container.get<ITipiCache>('ITipiCache');
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
