import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, expect, test, vi } from 'vitest';
import { getCliSecret } from '../permissions-helpers';

vi.unmock('fs');

const directories: string[] = [];

const createInstallation = () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'runtipi-permissions-'));
  directories.push(directory);

  return directory;
};

afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(directories.splice(0).map((directory) => fs.promises.rm(directory, { recursive: true, force: true })));
});

test('creates a durable CLI key independent of the legacy encryption secret and seed', async () => {
  const root = createInstallation();
  fs.mkdirSync(path.join(root, 'state'), { recursive: true });
  fs.mkdirSync(path.join(root, '.secrets'), { recursive: true, mode: 0o700 });
  fs.writeFileSync(path.join(root, 'state/seed'), 'existing-seed');
  fs.writeFileSync(path.join(root, 'state/cli-secret'), 'a'.repeat(64));

  const secret = await getCliSecret(root);

  expect(secret).toMatch(/^[a-f0-9]{64}$/);
  expect(secret).not.toBe('a'.repeat(64));
  expect(secret).not.toBe(crypto.createHmac('sha256', 'existing-seed').update('jwt_secret').digest('hex'));
  expect(await getCliSecret(root)).toBe(secret);
  expect(fs.statSync(path.join(root, '.secrets/cli-secret')).mode & 0o777).toBe(0o600);
  expect(fs.readFileSync(path.join(root, 'state/seed'), 'utf8')).toBe('existing-seed');
});

test('replaces an exposed CLI key and retains the replacement on subsequent starts', async () => {
  const root = createInstallation();
  fs.mkdirSync(path.join(root, 'state'), { recursive: true });
  fs.mkdirSync(path.join(root, '.secrets'), { recursive: true, mode: 0o700 });

  const secretPath = path.join(root, '.secrets/cli-secret');
  fs.writeFileSync(secretPath, 'a'.repeat(64));
  fs.chmodSync(secretPath, 0o644);

  const secret = await getCliSecret(root);

  expect(secret).not.toBe('a'.repeat(64));
  expect(await getCliSecret(root)).toBe(secret);
  expect(fs.statSync(secretPath).mode & 0o777).toBe(0o600);
});

test('an interrupted publication leaves the exposed key detectable so the next startup rotates it', async () => {
  const root = createInstallation();
  const directory = path.join(root, '.secrets');
  fs.mkdirSync(directory, { mode: 0o700 });
  const secretPath = path.join(directory, 'cli-secret');
  const exposedKey = 'a'.repeat(64);
  fs.writeFileSync(secretPath, exposedKey);
  fs.chmodSync(secretPath, 0o644);

  const rename = vi.spyOn(fs.promises, 'rename').mockImplementationOnce(async (source, destination) => {
    expect(destination).toBe(secretPath);
    expect(fs.readFileSync(source, 'utf8')).toMatch(/^[a-f0-9]{64}$/);
    expect(fs.readFileSync(source, 'utf8')).not.toBe(exposedKey);
    expect(fs.statSync(source).mode & 0o777).toBe(0o600);
    throw new Error('interrupted CLI key publication');
  });

  await expect(getCliSecret(root)).rejects.toThrow('interrupted CLI key publication');
  expect(fs.readFileSync(secretPath, 'utf8')).toBe(exposedKey);
  expect(fs.statSync(secretPath).mode & 0o777).toBe(0o644);
  expect(fs.readdirSync(directory)).toEqual(['cli-secret']);
  rename.mockRestore();

  const replacement = await getCliSecret(root);

  expect(replacement).not.toBe(exposedKey);
  expect(await getCliSecret(root)).toBe(replacement);
  expect(fs.statSync(secretPath).mode & 0o777).toBe(0o600);
});

test('retains an existing private key owned by the backend user', async () => {
  const root = createInstallation();
  fs.mkdirSync(path.join(root, '.secrets'), { mode: 0o700 });
  const secretPath = path.join(root, '.secrets/cli-secret');
  const secret = crypto.randomBytes(32).toString('hex');
  fs.writeFileSync(secretPath, secret, { mode: 0o600 });

  expect(fs.statSync(secretPath).uid).toBe(process.geteuid?.());
  await expect(getCliSecret(root)).resolves.toBe(secret);
  expect(fs.readFileSync(secretPath, 'utf8')).toBe(secret);
});

test('rejects a directory in place of the private key', async () => {
  const root = createInstallation();
  const secretPath = path.join(root, '.secrets/cli-secret');
  fs.mkdirSync(secretPath, { recursive: true, mode: 0o700 });

  await expect(getCliSecret(root)).rejects.toThrow();
  expect(fs.statSync(secretPath).isDirectory()).toBe(true);
});

test('rejects malformed private keys without changing their contents', async () => {
  const root = createInstallation();
  fs.mkdirSync(path.join(root, '.secrets'), { mode: 0o700 });
  const secretPath = path.join(root, '.secrets/cli-secret');
  fs.writeFileSync(secretPath, 'invalid', { mode: 0o600 });

  await expect(getCliSecret(root)).rejects.toThrow('contains an invalid CLI authentication key');
  expect(fs.readFileSync(secretPath, 'utf8')).toBe('invalid');
});

test.each(['symlink', 'hardlink'] as const)('rejects a %s at a private file without changing the target', async (kind) => {
  const root = createInstallation();
  const target = path.join(root, 'target');
  fs.mkdirSync(path.join(root, '.secrets'), { mode: 0o700 });
  const link = path.join(root, '.secrets/cli-secret');
  fs.writeFileSync(target, 'untouched');
  fs.chmodSync(target, 0o644);

  if (kind === 'symlink') {
    fs.symlinkSync(target, link);
  } else {
    fs.linkSync(target, link);
  }

  await expect(getCliSecret(root)).rejects.toThrow();
  expect(fs.readFileSync(target, 'utf8')).toBe('untouched');
  expect(fs.statSync(target).mode & 0o777).toBe(0o644);
});

test('rejects symlinked private storage while retaining shared Compose aliases', async () => {
  const root = createInstallation();
  const target = createInstallation();
  fs.symlinkSync(target, path.join(root, '.secrets'));

  await expect(getCliSecret(root)).rejects.toThrow('must be a directory');
  fs.unlinkSync(path.join(root, '.secrets'));
  fs.mkdirSync(path.join(root, 'user-config'), { mode: 0o777 });
  fs.chmodSync(path.join(root, 'user-config'), 0o777);
  fs.writeFileSync(path.join(target, 'compose.yml'), 'shared compose');
  fs.symlinkSync(path.join(target, 'compose.yml'), path.join(root, 'user-config/tipi-compose.yml'));

  await expect(getCliSecret(root)).resolves.toMatch(/^[a-f0-9]{64}$/);
  expect(fs.statSync(path.join(root, 'user-config')).mode & 0o777).toBe(0o777);
  expect(fs.readFileSync(path.join(root, 'user-config/tipi-compose.yml'), 'utf8')).toBe('shared compose');
});

test('rejects a writable private-storage parent without changing its permissions', async () => {
  const root = createInstallation();
  fs.chmodSync(root, 0o777);

  await expect(getCliSecret(root)).rejects.toThrow('not group- or world-writable');
  expect(fs.statSync(root).mode & 0o777).toBe(0o777);
  expect(fs.existsSync(path.join(root, '.secrets/cli-secret'))).toBe(false);
});
