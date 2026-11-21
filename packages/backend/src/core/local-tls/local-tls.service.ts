import { execFile } from 'node:child_process';
import { createPrivateKey, randomBytes, X509Certificate } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { Injectable } from '@nestjs/common';
import { ConfigurationService } from '../config/configuration.service';
import { FilesystemService } from '../filesystem/filesystem.service';
import { LoggerService } from '../logger/logger.service';

const openssl = promisify(execFile);
const DAY = 86_400_000;

@Injectable()
export class LocalTlsService {
  constructor(
    private readonly configuration: ConfigurationService,
    private readonly filesystem: FilesystemService,
    private readonly logger: LoggerService,
  ) {}

  public async ensure(localDomain?: string) {
    if (!localDomain) return;
    if (!/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i.test(localDomain)) {
      throw new Error('Invalid local TLS domain');
    }

    const { dataDir } = this.configuration.get('directories');
    const folder = this.filesystem.getSafeFilePath(path.join(dataDir, 'traefik', 'tls'));
    await fs.mkdir(folder, { recursive: true });

    await this.checkRecoveryMaterial(folder);

    const stage = await fs.mkdtemp(path.join(folder, '.local-tls-'));
    let preserveStage = false;

    try {
      await fs.chmod(stage, 0o700);
      const root = await this.selectRoot(folder);

      if (root) {
        await fs.copyFile(root.cert, path.join(stage, 'ca.pem'));
        await fs.copyFile(root.key, path.join(stage, 'ca-key.pem'));
      } else {
        await openssl('openssl', [
          'req',
          '-x509',
          '-newkey',
          'rsa:4096',
          '-nodes',
          '-sha256',
          '-days',
          '3650',
          '-subj',
          '/O=runtipi.io/CN=Runtipi Local CA',
          '-addext',
          'basicConstraints=critical,CA:TRUE',
          '-addext',
          'keyUsage=critical,keyCertSign,cRLSign',
          '-keyout',
          path.join(stage, 'ca-key.pem'),
          '-out',
          path.join(stage, 'ca.pem'),
        ]);
      }

      await fs.chmod(path.join(stage, 'ca-key.pem'), 0o600);
      const issuer = await this.validRoot(stage, 'ca.pem', 'ca-key.pem');
      if (!issuer) throw new Error('Generated local TLS CA is invalid');

      if (root?.cert === path.join(folder, 'ca.pem') && (await this.validLeaf(folder, issuer, localDomain))) {
        await fs.chmod(path.join(folder, 'ca-key.pem'), 0o600);
        await fs.chmod(path.join(folder, 'key.pem'), 0o600);
        return;
      }

      const days = Math.min(365, Math.floor((Date.parse(issuer.validTo) - Date.now()) / DAY));
      await fs.writeFile(
        path.join(stage, 'leaf.cnf'),
        [
          'basicConstraints=critical,CA:FALSE',
          'keyUsage=critical,digitalSignature,keyEncipherment',
          'extendedKeyUsage=serverAuth',
          `subjectAltName=DNS:${localDomain},DNS:*.${localDomain}`,
        ].join('\n'),
      );

      await openssl('openssl', [
        'req',
        '-new',
        '-newkey',
        'rsa:2048',
        '-nodes',
        '-sha256',
        '-subj',
        `/CN=${localDomain}`,
        '-keyout',
        path.join(stage, 'key.pem'),
        '-out',
        path.join(stage, 'leaf.csr'),
      ]);
      await fs.chmod(path.join(stage, 'key.pem'), 0o600);

      await openssl('openssl', [
        'x509',
        '-req',
        '-in',
        path.join(stage, 'leaf.csr'),
        '-CA',
        path.join(stage, 'ca.pem'),
        '-CAkey',
        path.join(stage, 'ca-key.pem'),
        '-set_serial',
        `0x${randomBytes(16).toString('hex')}`,
        '-days',
        String(days),
        '-sha256',
        '-extfile',
        path.join(stage, 'leaf.cnf'),
        '-out',
        path.join(stage, 'cert.pem'),
      ]);
      if (!(await this.validLeaf(stage, issuer, localDomain, 0))) throw new Error('Generated local TLS certificate is invalid');

      await this.install(folder, stage);

      if (!root) {
        this.logger.warn('Local TLS root CA replaced or created. Download the root certificate and install it on clients to trust local HTTPS.');
      } else if (root.cert === path.join(folder, 'cert.pem')) {
        this.logger.info('Preserved the existing trusted local TLS CA while migrating to a separate server certificate.');
      }
      this.logger.info(`Local TLS certificate ready for ${localDomain}`);
    } catch (error) {
      preserveStage = error instanceof AggregateError;
      throw error;
    } finally {
      if (!preserveStage) await fs.rm(stage, { recursive: true, force: true });
    }
  }

  private async checkRecoveryMaterial(folder: string) {
    const entries = await fs.readdir(folder, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory() || !entry.name.startsWith('.local-tls-')) continue;
      const stage = path.join(folder, entry.name);
      const files = await fs.readdir(stage);

      if (files.some((name) => name.endsWith('.backup'))) {
        throw new Error(
          `Unresolved local TLS recovery material in ${stage}. Recover the original certificate/key pairs using its .backup files before removing this directory and restarting.`,
        );
      }
    }
  }

  private async readPair(folder: string, certName: string, keyName: string) {
    let certPem: Buffer;
    let keyPem: Buffer;

    try {
      certPem = await fs.readFile(path.join(folder, certName));
      keyPem = await fs.readFile(path.join(folder, keyName));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return;
      throw error;
    }

    try {
      const certificate = new X509Certificate(certPem);
      const key = createPrivateKey(keyPem);

      if (!certificate.checkPrivateKey(key) || Date.parse(certificate.validFrom) > Date.now()) return;

      return certificate;
    } catch {
      return;
    }
  }

  private async verifyChain(args: string[]) {
    try {
      await openssl('openssl', ['verify', ...args]);
      return true;
    } catch (error) {
      const failure = error as { code?: string | number; stderr?: string };

      if (failure.code === 2 && /^error \d+ at \d+ depth lookup:/m.test(failure.stderr ?? '')) return false;
      throw error;
    }
  }

  private async validRoot(folder: string, certName: string, keyName: string) {
    const certificate = await this.readPair(folder, certName, keyName);

    if (!certificate?.ca || Date.parse(certificate.validTo) <= Date.now() + DAY) return;
    if (certificate.subject !== certificate.issuer || !certificate.verify(certificate.publicKey)) return;

    const { stdout } = await openssl('openssl', ['x509', '-in', path.join(folder, certName), '-noout', '-text']);
    // Older Runtipi roots have no keyUsage extension; retaining them preserves installed trust.
    if (stdout.includes('X509v3 Key Usage:') && !/Certificate Sign, CRL Sign/.test(stdout)) return;
    if (!(await this.verifyChain(['-check_ss_sig', '-CAfile', path.join(folder, certName), path.join(folder, certName)]))) return;

    return certificate;
  }

  private async selectRoot(folder: string) {
    if (await this.validRoot(folder, 'ca.pem', 'ca-key.pem')) {
      return { cert: path.join(folder, 'ca.pem'), key: path.join(folder, 'ca-key.pem') };
    }
    if (await this.validRoot(folder, 'cert.pem', 'key.pem')) {
      return { cert: path.join(folder, 'cert.pem'), key: path.join(folder, 'key.pem') };
    }
  }

  private async validLeaf(folder: string, issuer: X509Certificate, domain: string, minimumRemaining = DAY) {
    const certificate = await this.readPair(folder, 'cert.pem', 'key.pem');
    if (!certificate) return false;
    const expires = Date.parse(certificate.validTo);

    if (certificate.ca || expires <= Date.now() + minimumRemaining || expires > Date.parse(issuer.validTo)) return false;
    if (!certificate.keyUsage?.includes('1.3.6.1.5.5.7.3.1')) return false;

    const names = certificate.subjectAltName?.split(', ');
    if (!names?.includes(`DNS:${domain}`) || !names.includes(`DNS:*.${domain}`)) return false;
    if (!certificate.verify(issuer.publicKey)) return false;

    return this.verifyChain(['-purpose', 'sslserver', '-CAfile', path.join(folder, 'ca.pem'), path.join(folder, 'cert.pem')]);
  }

  private async install(folder: string, stage: string) {
    const names = ['ca.pem', 'ca-key.pem', 'cert.pem', 'key.pem'];
    const originals = new Set<string>();

    for (const name of names) {
      try {
        await fs.copyFile(path.join(folder, name), path.join(stage, `${name}.backup`));
        originals.add(name);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      }
    }

    const installed: string[] = [];
    try {
      for (const name of names) {
        await fs.rename(path.join(stage, name), path.join(folder, name));
        installed.push(name);
      }
    } catch (error) {
      const recoveryErrors: unknown[] = [];
      for (const name of installed.reverse()) {
        try {
          if (originals.has(name)) {
            await fs.rename(path.join(stage, `${name}.backup`), path.join(folder, name));
          } else {
            await fs.unlink(path.join(folder, name));
          }
        } catch (recoveryError) {
          recoveryErrors.push(recoveryError);
        }
      }

      if (recoveryErrors.length) {
        throw new AggregateError([error, ...recoveryErrors], `Local TLS rollback failed; recovery material retained in ${stage}`);
      }
      throw error;
    }
  }
}
