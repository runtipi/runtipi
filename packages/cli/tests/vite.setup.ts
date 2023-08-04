import fs from 'fs';
import path from 'path';
import { vi, beforeEach } from 'vitest';
import { getEnv } from '@/utils/environment/environment';

vi.mock('@runtipi/shared', async (importOriginal) => {
  const mod = (await importOriginal()) as object;

  return {
    ...mod,
    createLogger: vi.fn().mockReturnValue({
      info: vi.fn(),
      error: vi.fn(),
    }),
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

  const { rootFolderHost, appsRepoId } = getEnv();

  await fs.promises.mkdir(path.join(rootFolderHost, 'state'), { recursive: true });
  await fs.promises.writeFile(path.join(rootFolderHost, 'state', 'seed'), 'seed');
  await fs.promises.mkdir(path.join(rootFolderHost, 'repos', appsRepoId, 'apps'), { recursive: true });
});
