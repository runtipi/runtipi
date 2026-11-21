import fs from 'node:fs';
import path from 'node:path';
import type { ConfigurationService } from '@/core/config/configuration.service';
import { FilesystemService } from '@/core/filesystem/filesystem.service';
import type { LoggerService } from '@/core/logger/logger.service';
import type { AppUrn } from '@runtipi/common/types';
import { fromPartial } from '@total-typescript/shoehorn';
import { expect, onTestFinished, test, vi } from 'vitest';
import { mock } from 'vitest-mock-extended';
import { AppFilesManager } from '../app-files-manager';

vi.unmock('fs');
vi.unmock('node:fs');

const setup = async () => {
  const temporaryDirectory = await fs.promises.mkdtemp('/tmp/runtipi-generated-compose-');
  onTestFinished(() => fs.promises.rm(temporaryDirectory, { recursive: true, force: true }));

  const configuration = mock<ConfigurationService>();
  configuration.getConfig.mockReturnValue(
    fromPartial({ directories: { dataDir: temporaryDirectory, appDataDir: path.join(temporaryDirectory, 'app-data') } }),
  );

  const logger = mock<LoggerService>();
  const manager = new AppFilesManager(configuration, new FilesystemService(logger), logger);
  const appUrn = 'demo:test' as AppUrn;
  const appInstalledDir = path.join(temporaryDirectory, 'apps', 'test', 'demo');
  const generatedCompose = path.join(appInstalledDir, 'docker-compose.generated.yml');

  return { temporaryDirectory, manager, appUrn, appInstalledDir, generatedCompose };
};

test.each(['missing', 'regular file'])('regenerates Compose over a %s', async (entry) => {
  const { manager, appUrn, appInstalledDir, generatedCompose } = await setup();

  if (entry === 'regular file') {
    await fs.promises.mkdir(appInstalledDir, { recursive: true });
    await fs.promises.writeFile(generatedCompose, 'previous compose');
  }

  await manager.writeDockerComposeYml(appUrn, 'services: {}');
  await manager.writeDockerComposeYml(appUrn, 'services: { app: { image: example } }');

  expect((await fs.promises.lstat(generatedCompose)).isFile()).toBe(true);
  await expect(fs.promises.readFile(generatedCompose, 'utf8')).resolves.toBe('services: { app: { image: example } }\n');
  expect(await fs.promises.readdir(appInstalledDir)).toEqual(['docker-compose.generated.yml']);
});

test.each(['apps', 'store', 'app'] as const)('supports an operator-linked %s directory', async (parent) => {
  const { temporaryDirectory, manager, appUrn, appInstalledDir } = await setup();
  const externalDirectory = path.join(temporaryDirectory, 'external');
  const parentPaths = {
    apps: path.join(temporaryDirectory, 'apps'),
    store: path.join(temporaryDirectory, 'apps', 'test'),
    app: appInstalledDir,
  };
  const linkedParent = parentPaths[parent];

  await fs.promises.mkdir(externalDirectory);
  await fs.promises.writeFile(path.join(externalDirectory, 'marker'), 'original');
  await fs.promises.mkdir(path.dirname(linkedParent), { recursive: true });
  await fs.promises.symlink(externalDirectory, linkedParent);

  await manager.writeDockerComposeYml(appUrn, 'services: {}');

  await expect(fs.promises.readFile(path.join(appInstalledDir, 'docker-compose.generated.yml'), 'utf8')).resolves.toBe('services: {}\n');
  await expect(fs.promises.readFile(path.join(externalDirectory, 'marker'), 'utf8')).resolves.toBe('original');
});

test('does not delete a directory occupying the generated filename', async () => {
  const { manager, appUrn, appInstalledDir, generatedCompose } = await setup();
  await fs.promises.mkdir(generatedCompose, { recursive: true });
  await fs.promises.writeFile(path.join(generatedCompose, 'marker'), 'original');

  await expect(manager.writeDockerComposeYml(appUrn, 'services: {}')).rejects.toThrow('Failed to write generated docker compose file');

  await expect(fs.promises.readFile(path.join(generatedCompose, 'marker'), 'utf8')).resolves.toBe('original');
  expect(await fs.promises.readdir(appInstalledDir)).toEqual(['docker-compose.generated.yml']);
});

test('preserves restricted permissions on an existing generated Compose file', async () => {
  const { manager, appUrn, appInstalledDir, generatedCompose } = await setup();
  await fs.promises.mkdir(appInstalledDir, { recursive: true });
  await fs.promises.writeFile(generatedCompose, 'previous compose', { mode: 0o600 });

  await manager.writeDockerComposeYml(appUrn, 'services: {}');

  expect((await fs.promises.stat(generatedCompose)).mode & 0o777).toBe(0o600);
});

test('supports an operator-linked generated Compose file', async () => {
  const { temporaryDirectory, manager, appUrn, appInstalledDir, generatedCompose } = await setup();
  const operatorFile = path.join(temporaryDirectory, 'operator-compose.yml');
  await fs.promises.mkdir(appInstalledDir, { recursive: true });
  await fs.promises.writeFile(operatorFile, 'previous compose', { mode: 0o600 });
  await fs.promises.symlink(operatorFile, generatedCompose);

  await manager.writeDockerComposeYml(appUrn, 'services: {}');

  expect((await fs.promises.lstat(generatedCompose)).isSymbolicLink()).toBe(true);
  await expect(fs.promises.readFile(operatorFile, 'utf8')).resolves.toBe('services: {}\n');
  expect((await fs.promises.stat(operatorFile)).mode & 0o777).toBe(0o600);
});
