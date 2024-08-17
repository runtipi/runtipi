import 'reflect-metadata';
import path from 'node:path';
import { DATA_DIR } from '@/config/constants';
import type { ICache } from '@runtipi/cache';
import { fromPartial } from '@total-typescript/shoehorn';
import type { Job } from 'bullmq';
import fs from 'fs-extra';
import { afterAll, beforeEach, vi } from 'vitest';

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
  // @ts-expect-error - custom mock method
  fs.__resetAllMocks();
  await fs.promises.mkdir(path.join(DATA_DIR, 'state'), { recursive: true });
  await fs.promises.writeFile(path.join(DATA_DIR, 'state', 'settings.json'), '{}');
  await fs.promises.mkdir(path.join(DATA_DIR, 'logs'), { recursive: true });
  cookieStore = {};
});

afterAll(async () => {});

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
