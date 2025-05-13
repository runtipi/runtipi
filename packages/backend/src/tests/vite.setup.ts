import fs from 'node:fs';
import path from 'node:path';
import { DATA_DIR } from '@/common/constants.js';
import { beforeEach, vi } from 'vitest';
import type { FsMock } from './__mocks__/fs.js';

vi.mock('fs', async () => {
  const { fsMock } = await import('./__mocks__/fs.js');
  return {
    ...fsMock,
  };
});

beforeEach(async () => {
  (fs as unknown as FsMock).__resetAllMocks();

  const directories = [DATA_DIR, path.join(DATA_DIR, 'state'), path.join(DATA_DIR, 'backups')];

  try {
    await Promise.all(
      directories.map(async (dir) => {
        await fs.promises.mkdir(dir, { recursive: true });
      }),
    );

    await fs.promises.writeFile(path.join(DATA_DIR, 'state', 'seed'), 'seed');
    await fs.promises.writeFile(path.join(DATA_DIR, '.env'), 'ROOT_FOLDER_HOST=/opt/runtipi');
  } catch (err) {
    console.error('Failed to setup test directories', err);
  }
});
