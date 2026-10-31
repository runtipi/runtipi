import fs from 'node:fs';
import path from 'node:path';
import { ConfigurationService } from '@/core/config/configuration.service';
import { EncryptionService } from '@/core/encryption/encryption.service';
import { afterAll, afterEach, expect, test, vi } from 'vitest';
import { mock } from 'vitest-mock-extended';
import { generateSystemEnvFile } from '../env-helpers';

const { dataDir } = vi.hoisted(() => ({ dataDir: `/tmp/runtipi-env-security-${process.pid}-${Date.now()}` }));

vi.unmock('fs');
vi.mock('@/common/constants', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/common/constants')>()),
  DATA_DIR: dataDir,
}));

const originalEnvironment = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnvironment };
});

afterAll(async () => {
  await fs.promises.rm(dataDir, { recursive: true, force: true });
});

test('migrates an installation while preserving credentials, TOTP encryption, and the new CLI key across restarts', async () => {
  const encryptionSecret = 'legacy-encryption-secret';
  const config = mock<ConfigurationService>();
  config.get.calledWith('jwtSecret').mockReturnValue(encryptionSecret);

  const encryption = new EncryptionService(config);
  const encryptedTotp = encryption.encrypt('existing-totp-secret', 'user-salt');

  await fs.promises.mkdir(path.join(dataDir, 'state'), { recursive: true });
  await fs.promises.writeFile(
    path.join(dataDir, '.env'),
    `ROOT_FOLDER_HOST=/opt/runtipi\nJWT_SECRET=${encryptionSecret}\nPOSTGRES_PASSWORD=existing-db-password`,
  );
  await fs.promises.chmod(path.join(dataDir, '.env'), 0o664);
  await fs.promises.writeFile(path.join(dataDir, 'state/seed'), 'existing-seed');
  await fs.promises.writeFile(path.join(dataDir, 'state/settings.json'), '{}');
  await fs.promises.chmod(path.join(dataDir, 'state'), 0o777);

  const first = await generateSystemEnvFile();
  const cliSecret = fs.readFileSync(path.join(dataDir, '.secrets/cli-secret'), 'utf8');
  const second = await generateSystemEnvFile();

  expect(first.get('JWT_SECRET')).toBe(encryptionSecret);
  expect(second.get('JWT_SECRET')).toBe(encryptionSecret);
  expect(second.get('POSTGRES_PASSWORD')).toBe('existing-db-password');
  expect(fs.readFileSync(path.join(dataDir, 'state/seed'), 'utf8')).toBe('existing-seed');
  expect(fs.readFileSync(path.join(dataDir, '.secrets/cli-secret'), 'utf8')).toBe(cliSecret);
  expect(first.has('CLI_SECRET')).toBe(false);
  expect(cliSecret).not.toBe(encryptionSecret);
  expect(fs.statSync(path.join(dataDir, '.env')).mode & 0o777).toBe(0o664);
  expect(fs.statSync(path.join(dataDir, 'state')).mode & 0o777).toBe(0o777);
  expect(encryption.decrypt(encryptedTotp, 'user-salt')).toBe('existing-totp-secret');
});
