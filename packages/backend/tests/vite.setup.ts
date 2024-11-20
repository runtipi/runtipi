import fs from 'node:fs';
import path from 'node:path';
import { DATA_DIR } from '@/common/constants';
import { beforeEach, vi } from 'vitest';

vi.mock('fs', async () => {
  const { fsMock } = await import('./__mocks__/fs');
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
