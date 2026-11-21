import { execFile } from 'node:child_process';
import { X509Certificate } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { ConfigurationService } from '@/core/config/configuration.service';
import { FilesystemService } from '@/core/filesystem/filesystem.service';
import { LoggerService } from '@/core/logger/logger.service';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mock } from 'vitest-mock-extended';
import { LocalTlsService } from '../local-tls.service';

const openssl = promisify(execFile);
const DAY = 86_400_000;

describe('LocalTlsService with real OpenSSL material', { timeout: 30_000 }, () => {
  let dataDir: string;
  let folder: string;
  let service: LocalTlsService;
  const logger = mock<LoggerService>();
  const read = (name: string) => fs.readFile(path.join(folder, name), 'utf8');
  const cert = async (name: string) => new X509Certificate(await read(name));

  beforeEach(async () => {
    vi.clearAllMocks();
    dataDir = await fs.mkdtemp('/tmp/runtipi-tls-');
    folder = path.join(dataDir, 'traefik', 'tls');
    await fs.mkdir(folder, { recursive: true });

    const configuration = mock<ConfigurationService>();
    configuration.get.mockReturnValue({ dataDir } as never);
    service = new LocalTlsService(configuration, new FilesystemService(logger), logger);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    await fs.rm(dataDir, { recursive: true, force: true });
  });

  async function legacy(days = 365) {
    await openssl('openssl', [
      'req',
      '-x509',
      '-newkey',
      'rsa:2048',
      '-nodes',
      '-days',
      String(days),
      '-subj',
      '/CN=old.lan',
      '-addext',
      'basicConstraints=critical,CA:TRUE',
      '-keyout',
      path.join(folder, 'key.pem'),
      '-out',
      path.join(folder, 'cert.pem'),
    ]);
    return read('cert.pem');
  }

  it('creates constrained certificates, verifies the chain, restricts keys, and reuses unchanged material', async () => {
    await service.ensure('tipi.lan');
    const root = await cert('ca.pem');
    const leaf = await cert('cert.pem');
    expect(root.ca).toBe(true);
    expect(leaf.ca).toBe(false);
    expect(leaf.subjectAltName).toBe('DNS:tipi.lan, DNS:*.tipi.lan');
    expect(leaf.keyUsage).toContain('1.3.6.1.5.5.7.3.1');
    expect(Date.parse(leaf.validTo)).toBeLessThanOrEqual(Date.parse(root.validTo));
    expect(Date.parse(root.validTo) - Date.parse(root.validFrom)).toBe(3650 * DAY);
    const { stdout } = await openssl('openssl', ['x509', '-text', '-noout', '-in', path.join(folder, 'ca.pem')]);
    expect(stdout).toContain('Certificate Sign, CRL Sign');
    await openssl('openssl', ['verify', '-purpose', 'sslserver', '-CAfile', path.join(folder, 'ca.pem'), path.join(folder, 'cert.pem')]);
    for (const name of ['ca-key.pem', 'key.pem']) {
      expect((await fs.stat(path.join(folder, name))).mode & 0o777).toBe(0o600);
    }
    await service.ensure('tipi.lan');
    expect((await cert('cert.pem')).fingerprint256).toBe(leaf.fingerprint256);
    expect((await cert('ca.pem')).fingerprint256).toBe(root.fingerprint256);
  });

  it('preserves legacy trust without a marker, even when changing domains', async () => {
    const original = await legacy();
    await service.ensure('new.lan');
    expect(await read('ca.pem')).toBe(original);
    expect((await cert('cert.pem')).subjectAltName).toBe('DNS:new.lan, DNS:*.new.lan');
    await service.ensure('another.lan');
    expect(await read('ca.pem')).toBe(original);
  });

  it('renews an expiring leaf without rotating its root', async () => {
    await service.ensure('tipi.lan');
    const root = await read('ca.pem');
    await openssl('openssl', [
      'x509',
      '-in',
      path.join(folder, 'cert.pem'),
      '-CA',
      path.join(folder, 'ca.pem'),
      '-CAkey',
      path.join(folder, 'ca-key.pem'),
      '-set_serial',
      '123',
      '-days',
      '1',
      '-out',
      path.join(folder, 'expiring.pem'),
    ]);
    await fs.rename(path.join(folder, 'expiring.pem'), path.join(folder, 'cert.pem'));
    const leaf = await read('cert.pem');
    await service.ensure('tipi.lan');
    expect(await read('ca.pem')).toBe(root);
    expect(await read('cert.pem')).not.toBe(leaf);
    expect(Date.parse((await cert('cert.pem')).validTo)).toBeGreaterThan(Date.now() + 360 * DAY);
  });

  it('caps short-lived migrated certificates and rotates expired roots', async () => {
    const original = await legacy(2);
    await service.ensure('tipi.lan');
    expect(await read('ca.pem')).toBe(original);
    const root = await cert('ca.pem');
    const leaf = await cert('cert.pem');
    expect(Date.parse(leaf.validTo)).toBeLessThanOrEqual(Date.parse(root.validTo));
    expect(Date.parse(leaf.validTo) - Date.parse(leaf.validFrom)).toBe(DAY);
    vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 3 * DAY);
    await service.ensure('tipi.lan');
    expect(await read('ca.pem')).not.toBe(original);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('install it on clients'));
  });

  it('retains legacy material when a staged signing key becomes invalid', async () => {
    const original = await legacy();
    const key = await read('key.pem');
    const chmod = fs.chmod.bind(fs);
    vi.spyOn(fs, 'chmod').mockImplementation(async (file, mode) => {
      await chmod(file, mode);
      if (String(file).endsWith('/key.pem')) {
        await fs.writeFile(path.join(path.dirname(String(file)), 'ca-key.pem'), 'invalid signing key');
      }
    });
    await expect(service.ensure('tipi.lan')).rejects.toThrow();
    expect(await read('cert.pem')).toBe(original);
    expect(await read('key.pem')).toBe(key);
    await expect(fs.stat(path.join(folder, 'ca.pem'))).rejects.toThrow();
    expect(logger.info).not.toHaveBeenCalledWith(expect.stringContaining('certificate ready'));
  });

  it('retains trusted legacy files when staging storage fails', async () => {
    const original = await legacy();
    const key = await read('key.pem');
    vi.spyOn(fs, 'copyFile').mockRejectedValueOnce(new Error('storage failure'));

    await expect(service.ensure('new.lan')).rejects.toThrow('storage failure');
    expect(await read('cert.pem')).toBe(original);
    expect(await read('key.pem')).toBe(key);
    expect(logger.info).not.toHaveBeenCalledWith(expect.stringContaining('certificate ready'));
  });

  it('rolls back an interrupted installation, preserving both original pairs', async () => {
    await service.ensure('tipi.lan');
    const names = ['ca.pem', 'ca-key.pem', 'cert.pem', 'key.pem'];
    const originals = await Promise.all(names.map(read));
    const rename = fs.rename.bind(fs);
    vi.spyOn(fs, 'rename').mockImplementation(async (source, destination) => {
      if (String(source).endsWith('/key.pem')) throw new Error('storage failure');
      return rename(source, destination);
    });
    await expect(service.ensure('new.lan')).rejects.toThrow('storage failure');
    expect(await Promise.all(names.map(read))).toEqual(originals);
  });

  it.each(['ca.pem', 'cert.pem'])('preserves installed material when reading %s fails transiently', async (name) => {
    await service.ensure('tipi.lan');
    const names = ['ca.pem', 'ca-key.pem', 'cert.pem', 'key.pem'];
    const originals = await Promise.all(names.map(read));
    const readFile = fs.readFile.bind(fs);
    const failure = Object.assign(new Error('transient read failure'), { code: 'EIO' });
    let failed = false;

    vi.spyOn(fs, 'readFile').mockImplementation(async (...args) => {
      if (!failed && String(args[0]) === path.join(folder, name)) {
        failed = true;
        throw failure;
      }
      return readFile(...args);
    });

    await expect(service.ensure('tipi.lan')).rejects.toBe(failure);
    expect(await Promise.all(names.map(read))).toEqual(originals);
  });

  it('preserves installed material when OpenSSL cannot be started during validation', async () => {
    await service.ensure('tipi.lan');
    const names = ['ca.pem', 'ca-key.pem', 'cert.pem', 'key.pem'];
    const originals = await Promise.all(names.map(read));
    vi.stubEnv('PATH', dataDir);

    await expect(service.ensure('tipi.lan')).rejects.toMatchObject({ code: 'ENOENT', syscall: 'spawn openssl' });
    expect(await Promise.all(names.map(read))).toEqual(originals);
  });

  it('preserves installed material when OpenSSL exits 2 because it cannot load the root verification target', async () => {
    await service.ensure('tipi.lan');
    const names = ['ca.pem', 'ca-key.pem', 'cert.pem', 'key.pem'];
    const originals = await Promise.all(names.map(read));
    const { stdout } = await openssl('sh', ['-c', 'command -v openssl']);
    const bin = path.join(dataDir, 'bin');
    await fs.mkdir(bin);
    await fs.writeFile(
      path.join(bin, 'openssl'),
      [
        '#!/bin/sh',
        'if [ "$1" = verify ]; then',
        '  echo "Could not open file or uri for loading certificate file" >&2',
        '  echo "Unable to load certificate file" >&2',
        '  exit 2',
        'fi',
        'exec "$LOCAL_TLS_OPENSSL" "$@"',
      ].join('\n'),
      { mode: 0o700 },
    );
    vi.stubEnv('LOCAL_TLS_OPENSSL', stdout.trim());
    vi.stubEnv('PATH', bin);
    logger.warn.mockClear();
    logger.info.mockClear();

    await expect(service.ensure('new.lan')).rejects.toMatchObject({
      code: 2,
      stderr: expect.stringContaining('Unable to load certificate file'),
    });
    expect(await Promise.all(names.map(read))).toEqual(originals);
    expect(logger.warn).not.toHaveBeenCalled();
    expect(logger.info).not.toHaveBeenCalled();
  });

  it('replaces a root rejected by OpenSSL for an unknown critical extension', async () => {
    await legacy();
    const extensions = path.join(dataDir, 'root.cnf');
    await fs.writeFile(extensions, 'basicConstraints=critical,CA:TRUE\n1.2.3.4=critical,DER:01:01:FF');
    await openssl('openssl', [
      'x509',
      '-in',
      path.join(folder, 'cert.pem'),
      '-signkey',
      path.join(folder, 'key.pem'),
      '-extfile',
      extensions,
      '-out',
      path.join(folder, 'rejected.pem'),
    ]);
    await fs.rename(path.join(folder, 'rejected.pem'), path.join(folder, 'cert.pem'));
    const rejected = await read('cert.pem');

    await service.ensure('tipi.lan');
    expect(await read('ca.pem')).not.toBe(rejected);
    await openssl('openssl', ['verify', '-purpose', 'sslserver', '-CAfile', path.join(folder, 'ca.pem'), path.join(folder, 'cert.pem')]);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('install it on clients'));
  });

  it('blocks retries after failed rollback and retains the trusted recovery material', async () => {
    const original = await legacy();
    const key = await read('key.pem');
    const rename = fs.rename.bind(fs);

    const renameSpy = vi.spyOn(fs, 'rename').mockImplementation(async (source, destination) => {
      if (String(source).endsWith('/key.pem') || String(source).endsWith('/cert.pem.backup')) {
        throw new Error('storage failure');
      }
      return rename(source, destination);
    });

    await expect(service.ensure('new.lan')).rejects.toThrow('Local TLS rollback failed');
    renameSpy.mockRestore();

    const entries = await fs.readdir(folder);
    const stageName = entries.find((name) => name.startsWith('.local-tls-'));
    expect(stageName).toBeDefined();
    const stage = path.join(folder, stageName as string);
    const backups = await fs.readdir(stage);
    const installed = await read('cert.pem');

    await expect(service.ensure('new.lan')).rejects.toThrow(`Unresolved local TLS recovery material in ${stage}`);
    expect(await fs.readdir(folder)).toEqual(entries);
    expect(await fs.readdir(stage)).toEqual(backups);
    expect(await fs.readFile(path.join(stage, 'cert.pem.backup'), 'utf8')).toBe(original);
    expect(await fs.readFile(path.join(stage, 'key.pem.backup'), 'utf8')).toBe(key);
    expect(await read('cert.pem')).toBe(installed);
    expect(await read('key.pem')).toBe(key);
    await expect(fs.stat(path.join(folder, 'ca.pem'))).rejects.toThrow();
  });

  it('replaces mismatched roots and corrupt leaves with valid material', async () => {
    await service.ensure('tipi.lan');
    const root = await read('ca.pem');
    await fs.copyFile(path.join(folder, 'key.pem'), path.join(folder, 'ca-key.pem'));
    await fs.writeFile(path.join(folder, 'cert.pem'), '');
    await service.ensure('tipi.lan');
    expect(await read('ca.pem')).not.toBe(root);
    await openssl('openssl', ['verify', '-purpose', 'sslserver', '-CAfile', path.join(folder, 'ca.pem'), path.join(folder, 'cert.pem')]);
  });
});
