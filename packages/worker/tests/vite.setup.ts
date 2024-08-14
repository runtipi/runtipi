import 'reflect-metadata';
import fs from 'node:fs';
import path from 'node:path';
import { DATA_DIR } from '@/config/constants';
import { beforeEach, vi } from 'vitest';

vi.mock('@runtipi/shared/node', async (importOriginal) => {
  const mod = (await importOriginal()) as object;

  return {
    ...mod,
    createLogger: vi.fn().mockReturnValue({
      info: vi.fn(),
      error: vi.fn(),
    }),
    FileLogger: vi.fn().mockImplementation(() => ({
      flush: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    })),
  };
});

vi.mock('fs', async () => {
  const { fsMock } = await import('@/tests/mocks/fs');
  return {
    ...fsMock,
  };
});

beforeEach(async () => {
  // @ts-expect-error - custom mock method
  fs.__resetAllMocks();

  await fs.promises.mkdir(DATA_DIR, { recursive: true });
  await fs.promises.mkdir(path.join(DATA_DIR, 'state'), { recursive: true });
  await fs.promises.mkdir(path.join(DATA_DIR, 'backups'), { recursive: true });
  await fs.promises.writeFile(path.join(DATA_DIR, 'state', 'seed'), 'seed');
  await fs.promises.mkdir(path.join(DATA_DIR, 'repos', 'repo-id', 'apps'), { recursive: true });
});
