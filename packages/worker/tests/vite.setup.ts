import fs from 'fs';
import path from 'path';
import { vi, beforeEach } from 'vitest';
import { getEnv } from '@/lib/environment';
import { ROOT_FOLDER } from '@/config/constants';

vi.mock('@runtipi/shared', async (importOriginal) => {
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

  const { appsRepoId } = getEnv();

  await fs.promises.mkdir(path.join(ROOT_FOLDER, 'state'), { recursive: true });
  await fs.promises.writeFile(path.join(ROOT_FOLDER, 'state', 'seed'), 'seed');
  await fs.promises.mkdir(path.join(ROOT_FOLDER, 'repos', appsRepoId, 'apps'), { recursive: true });
});
