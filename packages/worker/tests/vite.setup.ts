import 'reflect-metadata';
import fs from 'node:fs';
import path from 'node:path';
import { DATA_DIR } from '@/config/constants';
import { beforeAll, beforeEach, vi } from 'vitest';
import { Migrator } from '@runtipi/db';
import type { ILogger } from '@runtipi/shared/src/node';

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

console.info = vi.fn();

beforeAll(async () => {
  const migrator = new Migrator(console as unknown as ILogger);
  await migrator.runPostgresMigrations({
    host: String(process.env.POSTGRES_HOST),
    port: Number(process.env.POSTGRES_PORT),
    password: String(process.env.POSTGRES_PASSWORD),
    database: String(process.env.POSTGRES_DBNAME),
    username: String(process.env.POSTGRES_USERNAME),
    migrationsFolder: path.join(__dirname, '../../db/assets'),
  });
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
