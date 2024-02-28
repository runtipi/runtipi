import fs from 'fs-extra';
import { fromPartial } from '@total-typescript/shoehorn';
import { Job } from 'bullmq';
import { tipiCache } from '@/server/core/TipiCache';

global.fetch = jest.fn();
// Mock global location
global.location = fromPartial({
  hostname: 'localhost',
});

// Temporary hack to still run all jest tests and get correct coverage
jest.mock('vitest', () => ({
  vi: jest,
}));

export const waitUntilFinishedMock = jest.fn().mockResolvedValue({ success: true, stdout: '' });
jest.mock('bullmq', () => ({
  Queue: jest.fn().mockImplementation(() => ({
    add: jest.fn(() => {
      const job: Job = fromPartial({
        waitUntilFinished: waitUntilFinishedMock,
      });

      return Promise.resolve(job);
    }),
    getRepeatableJobs: jest.fn().mockResolvedValue([]),
    removeRepeatableByKey: jest.fn(),
    obliterate: jest.fn(),
    close: jest.fn(),
  })),
  QueueEvents: jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    close: jest.fn(),
  })),
}));

console.error = jest.fn();

beforeEach(async () => {
  // @ts-expect-error - custom mock method
  fs.__resetAllMocks();
  await fs.promises.mkdir('/runtipi/state', { recursive: true });
  await fs.promises.writeFile('/runtipi/state/settings.json', '{}');
  await fs.promises.mkdir('/app/logs', { recursive: true });
});

afterAll(async () => {
  await tipiCache.close();
});

// Mock Logger
jest.mock('../../src/server/core/Logger', () => ({
  Logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('next/config', () => () => ({
  serverRuntimeConfig: {
    ...process.env,
  },
}));
