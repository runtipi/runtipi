import { ConfigurationService } from '@/core/config/configuration.service';
import { FilesystemService } from '@/core/filesystem/filesystem.service';
import { LoggerService } from '@/core/logger/logger.service';
import { fsMock } from '@/tests/__mocks__/fs';
import { expect, test } from 'vitest';
import { mock } from 'vitest-mock-extended';
import { SystemService } from '../system.service';

const setup = async () => {
  const dataDir = '/tmp/runtipi-ca-download';
  const tlsDir = `${dataDir}/traefik/tls`;
  const fs = fsMock.default.promises;

  await fs.mkdir(tlsDir, { recursive: true });
  await fs.writeFile(`${tlsDir}/cert.pem`, 'served leaf certificate');
  await fs.writeFile(`${tlsDir}/key.pem`, 'served leaf private key');
  await fs.writeFile(`${tlsDir}/ca-key.pem`, 'root CA private key');

  const logger = mock<LoggerService>();
  const config = mock<ConfigurationService>();
  config.get.mockReturnValue({ dataDir, appDataDir: `${dataDir}/app-data`, appDir: `${dataDir}/apps` });

  const filesystem = new FilesystemService(logger);
  const service = new SystemService(logger, config, filesystem);

  return { service, tlsDir, fs };
};

test('downloads only the public root CA from the configured data directory', async () => {
  const { service, tlsDir, fs } = await setup();
  const publicCa = '-----BEGIN CERTIFICATE-----\nlocal root CA\n-----END CERTIFICATE-----\n';
  await fs.writeFile(`${tlsDir}/ca.pem`, publicCa);

  await expect(service.getLocalCertificate()).resolves.toBe(publicCa);
});

test('returns no certificate when the root CA is absent, even if the leaf and private keys exist', async () => {
  const { service } = await setup();

  await expect(service.getLocalCertificate()).resolves.toBeUndefined();
});
